/*
    esp-confirm.js - 

    <esp-confirm header="" body="" ok=""/>
 */
angular.module('esp.confirm', [])
.directive('espConfirm', function($compile) {
    return {
        restrict: 'E',
        replace: true,
        link: function (scope, element, attrs) {
            scope.header = attrs.header;
            scope.body = attrs.body;
            scope.ok = attrs.ok;
            var html = 
                '<div class="modal-dialog">\n' + 
                    '<div class="modal-content">\n' + 
                        '<div class="modal-header">\n' + 
                            '<button type="button" class="close" ng-click="$dismiss()">×</button>\n' + 
                            '<h4 class="modal-title">{{header}}</h4>\n' + 
                        '</div>\n' + 
                        '<div class="modal-body">{{body}}</div>\n' + 
                        '<div class="modal-footer">\n' + 
                            '<button ng-click="$close(1)" class="btn btn-primary">{{ok}}</button>\n' + 
                            '<button ng-click="$dismiss()" class="btn">Cancel</button>\n' + 
                        '</div>\n' + 
                    '</div>\n' + 
                '</div>\n'
            var newelt = angular.element(html);
            element.append(newelt);
            $compile(newelt)(scope);
        }
    };
});
