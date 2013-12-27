/*
    auth.js - Auth model
 */
'use strict';

angular.module('app').factory('Auth', function (EspResource) {
    return EspResource.group("auth", {}, {
        'login':  { 'method': 'POST', url: '/:prefix/:controller/login' },
        'logout': { 'method': 'POST', url: '/:prefix/:controller/logout' },
    });
});
