/*
    esp-gauge.js - ESP esp-gauge directive

    <esp-gauge width="100" height="100" background="" color="" highlight="" title="Title" subtitle="Footnote" value="{{value}} range="low-high">

    Attributes:
        color       Text and arrow color
        height      Gauge height
        highlight   Color of the gauge sweep area
        range       Low-High range of the value
        subtitle    Not implemented yet
        title       Gauge title below the sweep
        value       Gauge value to display
        width       Gauge width

    The attributes override any scope values. Defaults taken from CSS for background, color and fonts.
 */
angular.module('esp.gauge', [])
.directive('espGauge', function(Esp, $compile, $timeout, $window) {
    var frameRate = 25;
    return {
        restrict: 'E',
        scope: {
            value: '@',
        },
        template: '<canvas>' + 'This text is displayed if your browser does not support HTML5 Canvas.' + '</canvas>',
        link: function (scope, element, attrs) {
            var children = element.children();
            var e = children[0];
            var c = e.getContext('2d');

            scope.lastUpdate = Date.now();
            scope.current = 0;
            scope.prior = -1;

            /*
                Inherit canvas size from the element style or attributes
             */
            angular.extend(scope, {
                highlight: '#60A8D8', 
                height: element.css('height'),
                width: element.css('width'),
                period: 1000,
            }, attrs);
            c.canvas.height = scope.height = parseInt(scope.height);
            c.canvas.width = scope.width = parseInt(scope.width);

            var w = angular.element($window);
            w.bind('resize', function() {
                c.canvas.width = scope.width = parseInt(element.css('width'));
            });
            if (!scope.background) {
                scope.background = Esp.rgb2hex(element.css('background-color'));
            }
            if (!scope.color) {
                scope.color = Esp.rgb2hex(element.css('color'));
            }
            scope.draw = function() {
                var value = scope.current;
                var children = element.children();
                var e = children[0];
                var c = e.getContext('2d');
                var background = scope.background;
                var color = scope.color;
                var height = parseInt(scope.height);
                var width = parseInt(scope.width);
                var x = width / 2;
                var y = height / 2;
                var cx = x;
                var cy = height * .8;
                var radius = height / 2;
                var arrowLength = radius * 1.1;
                var sweep = 0.7 * Math.PI;
                var startAngle = (1.5 * Math.PI) - (sweep / 2);
                var endAngle = (1.5 * Math.PI) + (sweep / 2);
                var font = element.css('font-family').split(',')[0]; 
                var fontSize = parseInt(element.css('font-size'));
                var fontWeight = element.css('font-weight');

                c.save();
                c.fillStyle = scope.background;
                c.fillRect(0, 0, width, height);

                //  Gauge title value
                value = (value - 0).toFixed(0);
                var avalue = 100.0 * value / (scope.high - scope.low);
                c.font = 'bold ' + fontSize + 'px ' + font;
                c.textAlign = 'center';
                c.fillStyle = scope.color;
                c.fillText(scope.value, x, 40);

                //  Gauge background
                c.beginPath();
                c.moveTo(cx, cy);
                c.arc(cx, cy, radius, startAngle, endAngle, false);
                var g = c.createLinearGradient(0, cy, width, cy);
                g.addColorStop(0, Esp.lighten(scope.highlight, 20));
                g.addColorStop(1, Esp.lighten(scope.highlight, -20));
                c.fillStyle = g;
                c.closePath();
                c.fill();

                // Center circle
                c.beginPath();
                c.moveTo(cx, cy);
                c.fillStyle = scope.background;
                c.arc(cx, cy, radius * .30, 0, 2 * Math.PI, false);
                c.closePath();
                c.fill();

                //  Lower title
                c.font = (fontSize / 3) + 'px ' + font;
                c.fillStyle = scope.color;
                c.textAlign = 'center';
                c.fillText(scope.title, cx, height - 5);

                function arrow(angle) {
                    c.save();
                    c.beginPath();
                    c.translate(cx, cy);
                    c.rotate(angle);

                    c.moveTo(0, -arrowLength);
                    c.lineTo(4, 0);
                    c.lineTo(-4, 0);
                    c.lineTo(0, -arrowLength);
                    c.closePath();
                    c.fillStyle = scope.color;
                    c.fill();

                    //  Arrow base
                    c.beginPath();
                    c.arc(0, 0, 4, 0, 2 * Math.PI, false);
                    c.fillStyle = scope.color;
                    c.closePath();
                    c.fill();
                    c.translate(-cx, -cy);
                    c.restore();
                }
                arrow((avalue - 50) / 50 * (sweep / 2));
                c.restore();
            };

            scope.$watch('value', function(v) {
                var value = v - 0;
                if (scope.range) {
                    var parts = scope.range.split('-');
                    scope.low = parts[0] - 0;
                    scope.high = parts[1] - 0;
                    if (value > scope.high) value = scope.high;
                    if (value < scope.low) value = scope.low;
                } else {
                    if (value < 0) value = 0;
                    if (value > 100) value = 100;
                    scope.low = 0;
                    scope.high = 100;
                }
                if (scope.prior == value) {
                    return;
                }
                scope.value = value;
                scope.prior = value;

                var now = Date.now();
                var period = now - scope.lastUpdate;
                if (period <= 0) {
                    period = 1000;
                }
                scope.lastUpdate = now;

                var steps = period / 1000 * frameRate;
                var inc = (value - scope.current) / steps;

                function animate() {
                    if (scope.timeout) {
                        $timeout.cancel(scope.timeout);
                    }
                    if (Math.abs(scope.value - scope.current) <= Math.abs(inc)) {
                        scope.current = scope.value;
                    } else {
                        scope.current += inc; 
                        scope.timeout = $timeout(animate, 1000 / frameRate);
                    }
                    scope.draw();
                }
                animate();
            });
        },
    };
});

