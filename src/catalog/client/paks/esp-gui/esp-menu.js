/*
    esp-menu.js - Kick sidebar menus

    <esp-menu text="Text" icon="" href="" value="" > ... sub menus </esp-menu>
 */
angular.module('esp.menu', [])
.directive('espMenu', function($compile) {
    var nextId = 0;
    return {
        restrict: 'E',
        transclude: true,
        compile: function(element, attrs, transclude) {
            return function(scope, element, attrs) {
                transclude(scope, function(child, innerScope) {
                    /* Child is a clone of the trancluded content */
                    /*
                        Aggregate all attributes and propagate down to the <li> element
                     */
                    var attributes = "";
                    angular.forEach(attrs.$attr, function(value, key){
                        attributes += ' ' + value + '="' + attrs[key] + '"';
                    });
                    var arrow = sub = toggle = href = '';
                    // var show = attrs.ngShow ? (' ng-show="' + attrs.ngShow + '"') : '';
                    if (child.length) {
                        var id = '$esp_menu_' + nextId++;
                        toggle = ' ng-click="' + id + '=!' + id + '"';
                        sub = '<ul class="nested" ng-show="' + id + '"></ul>';
                        arrow = '<i class="arrow fa" ng-class="{\'fa-caret-down\':' + id + 
                                ', \'fa-caret-left\': !' + id + '}""></i>';
                        href = '';
                    } else {
                        href = '#' + attrs.href;
                    }
                    var active = ' ng-class="{selected: path() == \'' + attrs.href + '\'}"';
                    var html = '<li' + attributes + active + '>' + 
                                '   <a href="' + href + '"' + toggle + '>' + 
                                '       <i class="' + attrs.icon + '"></i>' + 
                                '       <span>' + attrs.value + '</span>' + arrow + 
                                '   </a>';
                                '</li>';
                    var subelt = angular.element(sub);
                    subelt.append(child);
                    var newelt = angular.element(html);
                    newelt.append(subelt);
                    $compile(newelt)(scope);
                    element.replaceWith(newelt);
                });
            };
        },
    };
});
