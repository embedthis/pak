/*
    main.js - Application main script
*/
'use strict';

/*
    Create the primary application module and specify the list of required dependencies. 
    Application controllers and models create other sub-modules.
 */
var app = angular.module('app', ['ngAnimate', 'ngRoute', 'esp', 'esp.gui']);

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
        templateUrl: esp.url('/app/pak/pak-search.html'),
    });
    // $routeProvider.otherwise({ redirectTo: esp.url('/') });
});

/*
    Dynamically resize the div.content when the window is resized to be maximum height
 */
app.run(function($timeout, $window) {
    window.onresize = function() {
        var elt = angular.element(document.getElementById('content'));
        var scope = angular.element(elt).scope();
        if (scope && elt) {
            scope.$apply(function() {
                elt.css('min-height', '' + ($window.innerHeight - 75) + 'px');
            });
        }
    };
    $timeout(window.onresize, 1, true);
});
