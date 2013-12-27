/*
    AuthControl.js - Auth Controller

    This controller manages auth login/logout and admin editing of auth configuration.
    The authnames are pak names and the passwords are pak passwords.
 */
 
'use strict';

angular.module('app').controller('AuthControl', function (Esp, Auth, $rootScope, $route, $scope, $location, $modal, $routeParams, $timeout, $window) {
    angular.extend($scope, $routeParams);

    /*
        Default the authname based on the search selection context set in rootScope
     */
    $scope.auth = {};
    $scope.auth.authname = $rootScope.authname || '';

    $scope.login = function(dialog) {
        Auth.login($scope.auth, function(response, fn) {
            if (response.error) {
                Esp.logout();
                $location.path("/");
            } else {
                Esp.login(response.auth);
                dialog.dismiss();
                if (Esp.referrer) {
                    $window.location.href = Esp.referrer;
                    Esp.referrer = null;
                } else {
                    $location.path("/");
                }
            }
        }, function(response, fn) {
            console.log(response);
        });
    };

    $scope.logout = function() {
        if (Esp.user) {
            Esp.logout();
            Auth.logout({}, function() {
                Esp.feedback('inform', 'Logged Out');
                $location.path("/");
                $route.reload();
            });
        } else {
            Esp.feedback('inform', 'Logged Out');
            $location.path("/");
        }
    };

    $scope.dismiss = function(dialog) {
        dialog.dismiss();
        $location.path("/");
    };
});

/*
    Routes for Auth
 */
angular.module('app').config(function($routeProvider) {
    var esp = angular.module('esp');
    var Default = {
        controller: 'AuthControl',
        resolve: { action: esp.checkAuth },
    };
    $routeProvider.when('/auth/login',  angular.extend({}, Default, {templateUrl: esp.url('/app/auth/auth-login.html')}));
    $routeProvider.when('/auth/logout', angular.extend({}, Default, {template: '<p ng-init="logout()"> </p>'}));
});
