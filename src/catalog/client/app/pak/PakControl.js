/*
    Pak Controller
 */

'use strict';

/*
    Specify the Pak controller and its dependencies.
 */
angular.module('app').controller('PakControl', function (Esp, Pak, $location, $modal, $routeParams, $scope, $rootScope, $window) {
    angular.extend($scope, $routeParams);
    $scope.unused = '_   U N U S E D   _';

    if ($location.path() == "/pak/") {
        /* Create new pak */
        Pak.init(null, $scope);

    } else {
        /* Edit pak or search for list of paks */
        if ($scope.id || $location.path() == "/pak/") {
            var pak, found;
            if (!$scope.paks) {
                $location.path('/');
                return;
            }
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
                    $rootScope.authname = pak.name;
                }
                $location.path('/auth/login');
                return
            }
        }
        if ($scope.id) {
            Pak.get({id: $scope.id}, $scope, function(response) {
                $scope.pak.password = $scope.unused;
                $scope.pak.confirm  = $scope.unused;
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

    $scope.retract = function() {
        if ($scope.pak.password == $scope.unused) {
            Esp.feedback('error', 'Must enter password and confirmation to delete a pak');
            return;
        }
        if ($scope.pak.password != $scope.pak.confirm) {
            Esp.feedback('error', 'Password confirmation does not match');
            return;
        }
        $modal.open({
            scope: $scope,
            template: '<esp-confirm header="Are you sure?" body="Do you want to delete {{pak.name}}?" ok="Delete Pak">',
        }).result.then(function(result) {
            if (result) {
                Pak.retract($scope.pak, function(response) {
                    $location.path("/");
                });
            }
        });
    };

    $scope.publish = function() {
        if ($scope.pak.password != $scope.pak.confirm) {
            Esp.feedback('error', 'Password confirmation does not match');
            return;
        }
        if ($scope.pak.password == $scope.unused) {
            delete $scope.pak.password;
            delete $scope.pak.confirm;
        }
        Pak.publish($scope.pak, $scope, function(response) {
            if (!response.error) {
                Esp.feedback('inform', 'Pak ' + $scope.pak.name + ' saved')
                $location.path('/');
            }
        });
    };

    $scope.authname = function () {
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
});
