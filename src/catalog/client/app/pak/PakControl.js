/*
    Pak Controller
 */

'use strict';

/*
    Specify the Pak controller and its dependencies.
 */
angular.module('app').controller('PakControl', function (Esp, Pak, $location, $routeParams, $scope) {
    angular.extend($scope, $routeParams);

    /*
        Model calling sequence:
            Pak.action(input-params, [output], [response-mappings], [success-callback], [failure-callback]);
            Pak will set results to [output] and update $rootScope.feedback as appropriate.
     */
    if ($scope.id) {
        Pak.get({id: $scope.id}, $scope);

    } else if ($location.path() == "/pak/") {
        Pak.init(null, $scope);

    } else {
        Pak.list(null, $scope, {paks: "data"});
    }

    $scope.remove = function() {
        Pak.remove({id: $scope.id}, function(response) {
            $location.path("/");
        });
    };

    $scope.save = function() {
        Pak.update($scope.pak, $scope, function(response) {
            if (!response.error) {
                $location.path('/');
            }
        });
    };
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
    $routeProvider.when('/', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-list.html')}));
    $routeProvider.when('/pak/:id', angular.extend({}, Default, {templateUrl: esp.url('/app/pak/pak-edit.html')}));
});
