/*
    esp-field-errors.js - ESP esp-field-errors directive

    <esp-field-errors></esp-field-errors>
 */
angular.module('esp.field-errors', [])
.directive('espFieldErrors', function() {
    return {
        restrict: 'AE',
        transclude: true,
        template: '<div>\n' +
                  '  <div class="form-error ng-cloak" ng-show="fieldErrors">\n' + 
                  '    <h2>The form has errors that prevent it being saved.</h2>\n' +
                  '    <p>There were problems with the following fields:</p>\n' +
                  '    <ul ng-repeat="msg in fieldErrors">\n' +
                  '      <li>{{msg}}</li>\n' +
                  '  </div>\n' +
                  '  <div ng-transclude></div>\n' +
                  '</div>\n'
    };
});
