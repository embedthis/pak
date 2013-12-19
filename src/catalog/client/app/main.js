/*
    main.js - Application main script
*/
'use strict';

/*
    Create the primary application module and specify the list of required dependencies. 
    Application controllers and models create other sub-modules.
 */
var app = angular.module('app', ['ngAnimate', 'ngRoute', 'esp']);

/*
    Use manual bootstrap so the Angular scripts can be put at the end of the HTML page
 */
angular.element(document).ready(function() {
    angular.bootstrap(document, ['app']);
});

/*
    Request routes
 */
app.config(function($routeProvider) {
    var esp = angular.module('esp');
    $routeProvider.when('/', { 
        templateUrl: esp.url('/pages/splash.html'),
    });
    $routeProvider.otherwise({ redirectTo: esp.url('/') });
});
