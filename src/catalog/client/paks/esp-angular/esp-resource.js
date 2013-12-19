/*
    esp-resource.js - 
 */
'use strict';

angular.module('esp.resource', [])
.factory('EspResource', function(Esp, $http, $parse, $q, $rootScope) {

    var GroupActions = {
        'create': { 'method': 'POST',   url: '/:prefix/:controller' },
        'edit':   { 'method': 'GET',    url: '/:prefix/:controller/:id/edit' },
        'get':    { 'method': 'GET',    url: '/:prefix/:controller/:id' },
        'init':   { 'method': 'GET',    url: '/:prefix/:controller/init' },
        'list':   { 'method': 'GET',    url: '/:prefix/:controller/list' },
        'remove': { 'method': 'DELETE', url: '/:prefix/:controller/:id' },
        'update': { 'method': 'POST',   url: '/:prefix/:controller/:id' },
    };          
    var SingletonActions = {
        'create': { 'method': 'POST',   url: '/:prefix/:controller' },
        'edit':   { 'method': 'GET',    url: '/:prefix/:controller/edit' },
        'get':    { 'method': 'GET',    url: '/:prefix/:controller' },
        'init':   { 'method': 'GET',    url: '/:prefix/:controller/init' },
        'remove': { 'method': 'DELETE', url: '/:prefix/:controller' },
        'update': { 'method': 'POST',   url: '/:prefix/:controller' },
    };
    var DefaultParams = {
        prefix: function() {
            if (Esp.config && Esp.config.prefix) {
                return Esp.config.prefix.slice(1);
            }
            return "service";
        },          
    };

    /*
        Action properties are passed through to $http except for params which are blended with explict params.
     */
    function makeResource(defaultParams, actions) {
        var resource = {}

        angular.forEach(actions, function(action, actionName) {
            /*
                Resource.action(params, [scope], [mappings], [success], [failure]
             */
            resource[actionName] = function(context, p2, p3, p4, p5) {
                var context, scope, mappings, success, failure;
                if (angular.isFunction(p2)) {
                    success = p2;
                    failure = p3;
                } else if (angular.isFunction(p3)) {
                    scope = p2;
                    success = p3;
                    failure = p4;
                } else {
                    scope = p2;
                    mappings = p3;
                    success = p4;
                    failure = p5;
                }
                var params = angular.extend({}, defaultParams, action.params || {}, cleanParams(context));
                angular.forEach(params, function(value, key) {
                    if (angular.isFunction(value)) {
                        params[key] = value();
                    }
                    if (params[key] && params[key].replace) {
                        params[key] = params[key].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    }
                });
                var args = {};
                if (/^(POST|PUT)$/i.test(action.method)) {
                    args.data = params;
                }
                angular.forEach(action, function(value, key) {
                    if (key != 'params' && key != 'interceptor') {
                        args[key] = angular.copy(value);
                    }
                });
                args.url = action.url.replace(/:\w*/g, function(match, lead, tail) {
                    var name = match.slice(1);
                    return params[name] ? params[name] : '';
                }); 
                var http = $http(args).then(function(response) {
                    var data = response.data;
                    mappings = prepMappings(mappings, params, data);
                    angular.forEach(mappings, function(value, key) {
                        if (key == 'inform') {
                            if (!data.error) {
                                $rootScope.feedback = $rootScope.feedback || {};
                                $rootScope.feedback[key] = value;
                            }
                        } else if (key == 'error') {
                            if (data.error) {
                                $rootScope.feedback = $rootScope.feedback || {};
                                $rootScope.feedback[key] = value;
                            }
                        } else if (data[value]) {
                            data[key] = data[value];
                            delete data[value];
                        } else {
                            data[key] = value;
                        }
                    });
                    //  TODO - should be a function
                    angular.forEach(data, function(value, key) {
                        if (key == 'feedback') {
                            $rootScope[key] = value;
                        } else if (scope) {
                            scope[key] = value;
                        }
                    });
                    response.http = http;
                    (success || angular.noop)(data, response);
                    return response;

                }, function(response) {
                    (failure || angular.noop)(response);
                    return $q.reject(response);

                });
                http.args = args;
                http.context = context;
                http.scope = scope;
                http.params = params;
                return http;
            };
        });
        return resource;
    }

    function prepMappings(mappings, params, data) {
        var map = mappings || {};
        if (!data.data) {
            return map;
        }
        var found;
        angular.forEach(map, function(value,key) {
            if (value == 'data') {
                found = true;
                return;
            }
        });
        if (!found) {
            map[params.controller] = "data";
        }
        return map;
    }

    function cleanParams(params) {
        var result = {};
        angular.forEach(params, function(value, key) {
            if (key.charAt(0) != '$' && key != 'this' && !angular.isFunction(value)) {
                result[key] = value;
            }
        });
        return result;
    }

    return {
        /*
            Create a group resource
         */
        group: function(controller, params, actions) {
            actions = angular.extend({}, GroupActions, actions);
            params = angular.extend({}, DefaultParams, params);
            params.controller = controller;
            return makeResource(params, actions);
        },

        /*
            Create a singleton resource
         */
        solo: function(controller, params, actions) {
            actions = angular.extend({}, SingletonActions, actions);
            params = angular.extend({}, DefaultParams, params);
            params.controller = controller;
            return makeResource(params, actions);
        }
    };
});
