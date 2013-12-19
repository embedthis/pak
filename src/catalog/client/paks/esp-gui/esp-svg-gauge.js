/*
    esp-svg-gauge.js - ESP esp-svg gauge directive

    This is a prototype only and not supported.

    <esp-svg width="100" height="100" background="" color="" highlight="" title="Title" subtitle="Footnote" value="{{value}} range="low-high">
 */
angular.module('esp.svg', [])
.directive('espSvg', function(Esp, $compile) {
    return {
        restrict: 'E',
        scope: {
            value: '@',
        },
        template:   '<svg class="gauge" ng-attr-width="{{width}}" ng-attr-height="{{height}}">' +
                    '<defs>' +
                        '<linearGradient id="-esp-gauge-gradient-{{$id}}">' + 
                            '<stop offset ="0%" style="stop-color: {{stop1}};"/>' + 
                            '<stop offset="100%" style="stop-color: {{stop2}};"/>' + 
                        '</linearGradient>' + 
                    '</defs>' +
                    '<text x="100" y="40" text-anchor="middle" font-size="40" font-weight="bold" fill="gray">{{value}}{{subtitle}}</text>' +
                    '<path d="M10 110 A 115 115 0, 0 1, 190, 110 L 100 165 Z" fill="url(#-esp-gauge-gradient-{{$id}})" />' +
                    '<circle cx="100" cy="165" r="35" fill="{{background}}" />' +
                    '<path d="M104 165 L 100 50 L 96 165 Z" fill="{{highlight}}" transform="rotate({{angle}} 100 165)" >' +
                    '</path>' +
                    '<circle cx="100" cy="165" r="4" fill="{{highlight}}" />' +
                    '<text x="100" y="195" text-anchor="middle" font-size="16" fill="gray">{{title}}</text>' +
                '</svg>',
                /*
                    '       <animateTransform attributeType="xml" attributeName="transform" type="rotate"' +
                    '           from="{{prior}} 100 165" to="{{angle}} 100 165" dur="1s"/>' +
                    */
        compile: function(element, attrs, transclude) {
            return function (scope, element, attrs) {
                angular.extend(scope, attrs);
                if (!scope.background) {
                    scope.background = Esp.rgb2hex(element.css('background-color'));
                }
                if (!scope.color) {
                    scope.color = Esp.rgb2hex(element.css('color'));
                }
                scope.highlight = '#404040';
                scope.$watch('value', function(value) {
                    scope.stop1 = Esp.lighten(scope.color, 10);
                    scope.stop2 = Esp.lighten(scope.color, -10);
                    var avalue = value - 0;
                    scope.prior = scope.angle;
                    if (scope.range) {
                        var parts = scope.range.split('-');
                        var low = parts[0] - 0, high = parts[1] - 0;
                        if (avalue > high) avalue = high;
                        if (avalue < low) avalue = low;
                        scope.angle = ((100.0 * avalue / (high - low)) - 50) * 1.17;
                    } else {
                        if (avalue < 0) avalue = 0;
                        if (avalue > 100) avalue = 100;
                        scope.angle = (avalue - 50) * 1.17;
                    }
                    scope.prior = parseInt(scope.prior);
                    scope.angle = parseInt(scope.angle);
                });
            };
        },
    };
});
