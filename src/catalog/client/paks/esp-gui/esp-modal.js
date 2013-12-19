/*
    esp-modal.js - Display a modal dialog

    <esp-modal close="" show="">
        body
    </esp-modal>
 */
'use strict';

angular.module('esp.modal', [])
.directive('espModal', function ($parse, $modal) {
    return {
        restrict: 'EA',
        terminal: true,
        link: function (scope, element, attributes) {
            var options = angular.extend({}, scope.$eval(attributes.options));
            var showExpr = attributes.show || "$id";
            options = angular.extend(options, {
                scope: scope,
                template: element.html(), 
            });
            element.remove();
            var closeDialog;
            if (attributes.close) {
                closeDialog = function() {
                    $parse(attributes.close)(scope);
                };
            }
            scope.$watch(showExpr, function(show, old) {
                if (show) {
                    var dialog = $modal.open(options);
                    scope.$dialog = dialog;
                    dialog.result.then(function() {
                        closeDialog();
                    });
                } else {
                    $modal.dismiss("Change in ng-show value");
                }
            });
        }
    };
});
