/*
    Pak Controller
 */

'use strict';

/*
    Specify the Pak controller and its dependencies.
 */
angular.module('app').controller('PakControl', function (Esp, Pak, $location, $modal, $routeParams, $scope, $rootScope, $window) {
    angular.extend($scope, $routeParams);

    if ($location.path() == "/pak/") {
        /* Create new pak */
        Pak.init(null, $scope);

    } else {
        /* Edit pak or search for list of paks */
        if ($scope.id || $location.path() == "/pak/") {
            var pak, found;
            for (var i = 0; i < $scope.paks.length; i++) {
                if ($scope.paks[i].id == $scope.id) {
                    pak = $scope.paks[i];
                    if (Esp.user && Esp.user.name == $scope.paks[i].name) {
                        found = true;
                        break;
                    }
                }
            }
            if (!Esp.can('edit') || !found) {
                if (pak) {
                    $rootScope.username = pak.name;
                }
                $location.path('/user/login');
                return
            }
        }
        if ($scope.id) {
            Pak.get({id: $scope.id}, $scope, function(response) {
                console.log($scope.pak);
                $scope.pak.password = '_ _ U N U S E D _ _';
                $scope.pak.confirm  = '_ _ U N U S E D _ _';
            });
        }
    }

    /*  Default the seaerch to the last executed keywords */
    $scope.keywords = $rootScope.keywords;
    $scope.$watch('keywords', function() {
        if ($scope.keywords || true) {
            Pak.search({keywords: $scope.keywords}, $scope, {results: "data"}, function(response) {
                /* Save for just above where we persist the last search results */
                $rootScope.keywords = $scope.keywords;
                $rootScope.paks = $scope.results;
            });
        }
    });

    $scope.remove = function() {
        $modal.open({
            scope: $scope,
            template: '<esp-confirm header="Are you sure?" body="Do you want to remove {{pak.name}}?" ok="Delete Pak">',
        }).result.then(function(result) {
            if (result) {
                Pak.remove({id: $scope.pak.id}, function(response) {
                    $location.path("/");
                });
            }
        });
    };

    $scope.save = function() {
        if ($scope.pak.password != $scope.pak.confirm) {
            //  MOB - should have an API for this
            $rootScope.feedback = { error: "Password confirmation does not match" };
            return;
        }
        if ($scope.pak.password == '_ _ U N U S E D _ _') {

        }
        //  MOB - must be https
        Pak.publish($scope.pak, $scope, function(response) {
            if (!response.error) {
                $location.path('/');
            }
        });
    };

    //  MOB - need this in Esp
    $scope.go = function (url) {
        if (url.indexOf("http") == 0) {
            $window.location.href = url;
        } else if (url.indexOf("git@github") == 0) {
            $rootScope.feedback = { inform: "Private repository" };
        } else {
            $location.path(url);
        }
    }

    $scope.username = function () {
        return (Esp.user && Esp.user.name) || 'guest';
    }
});

/*
    Setup Pak routes
 */
angular.module('app').config(function($routeProvider) {
    var esp = angular.module('esp');
    var Default = {
        controller: 'PakControl',
        resolve: { action: 'Esp' },
    };
    $routeProvider.when('/pak/search', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-search.html')}));
    $routeProvider.when('/pak/list', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-list.html')}));
    $routeProvider.when('/pak/:id', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-edit.html')}));
    $routeProvider.when('/pak/', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-edit.html')}));
    // $routeProvider.when('/', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-list.html')}));
});
