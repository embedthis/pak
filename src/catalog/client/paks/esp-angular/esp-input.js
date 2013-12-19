/*
    esp-input.js - ESP esp-input directive

    Attributes:
        ng-model="MODEL.FIELD"  Angular model field object
        type="type"       Input control type to render (checkbox, text, textarea, date, email, tel, url, search, color, number, range)
        label="Text"
        labelClass="Class"
        inputClass="Class"
        filter="Filter"
        value="Value"       # Use instead of model

    Expands to a datatype specific input element. This directive expects a $scope.schema to describe the datatype.
    <esp-input type="radio" ng-model="post.title" ...>
 */
angular.module('esp.input', [])
.directive('espInput', function($compile, $filter, $rootScope) {
    var dataTypeToTagType = {
        binary: 'text',
        bool: 'checkbox',
        date: 'date',
        float: 'text',
        int: 'text',
        string: 'text',
        text: '',
    }
    var dataTypeToTag = {
        binary: 'input',
        bool: 'input',
        date: 'input',
        float: 'input',
        int: 'input',
        string: 'input',
        text: 'textarea',
    }
    return {
        restrict: 'E',
        replace: true,
        link: function (scope, element, attrs) {
            var name = attrs.ngModel;
            var value, model, field;
            if (name) {
                var parts = name.split('.');
                model = parts[0];
                field = parts[1];
            }
            value = attrs.value;
        
            function title(str) {
                str = str.replace(/[A-Z][a-zA-Z0-9$_]*/g, ' $&');
                var words = str.split(/[ \.]/g);
                for (var i = 0; i < words.length; i++) {
                    words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
                }
                return words.join(' ');
            }

            scope.$watch('schema', function (val) {
                if (scope.schema && element.parent().length && element.children().length == 0) {
                    var dataType = scope.schema.types[field].type;
                    var inputClass = (attrs.inputClass) ? attrs.inputClass : 'col-xs-6';
                    var errorHighlight = " ng-class='{\"has-error\": fieldErrors." + field + "}'";
                    var label = attrs.label ? attrs.label : title(field);
                    var labelClass = (attrs.labelClass) ? attrs.labelClass : 'col-xs-3';
                    var tag, type;
                    if (attrs.type) {
                        type = attrs.type;
                        if (type == 'textarea') { 
                            tag = 'textarea'; 
                        } else {
                            tag = 'input';
                        }
                    } else {
                        tag = dataTypeToTag[dataType] || "input";
                        type = dataTypeToTagType[dataType] || "text";
                    }
                    var astr = '';
                    if (!attrs.$attr['class']) {
                        attrs.$attr['class'] = 'class';
                        attrs['class'] = 'form-control input-small';
                    }
                    angular.forEach(attrs.$attr, function(avalue, key) {
                        astr += ' ' + avalue + '="' + attrs[key] + '"';
                    });
                    var html = '';
                    if (type == 'checkbox') {
                        astr = astr.replace(/form-control/, '');
                        if (scope.options) {
                            angular.forEach(scope.options[field], function(value, key) {
                                astr += ' ng-' + key + '-value="' + value + '"';
                            });
                        }
                        html =  '<label class="checkbox">' + 
                                    '<' + tag + ' type="' + type + '"' + astr + '>' +
                                '</label>';

                    } else if (type == 'radio') {
                        astr = astr.replace(/form-control/, '');
                        if (scope.options) {
                            angular.forEach(scope.options[field], function(value,key) {
                                html = html + '<label class="radio">' + 
                                        '<' + tag + ' type="' + type + '"' + astr + ' value="' + key + '"">' + value +
                                    '</label>';
                            });
                        }

                    } else if (type == 'select') {
                        html = '<select ' + astr + '>';
                        if (scope.options) {
                            angular.forEach(scope.options[field], function(value,key) {
                                html = html + '<option value="' + key + '"">' + value + '</option>';
                            });
                        }
                    } else if (type == 'text') {
                        html = '<' + tag + ' type="' + type + '"' + astr + '></' + tag + '>';
                    } else {
                        html = '<' + tag + ' type="' + type + '"' + astr + '>';
                    }
                    html = '<div class="form-group">' +
                                '<label class="control-label ' + labelClass + '">' + label + '</label>' +
                                '<div class="input-group ' + inputClass + '"' + errorHighlight + '>' + 
                                    html + 
                                    '<span class="field-error" ng-show="fieldErrors.' + field + '">{{fieldErrors.' + field + '}}</span>' +
                                '</div>' +
                            '</div>';
                    var newelt = angular.element(html);
                    element.append(newelt);
                    element.removeAttr('class');
                    element.removeAttr('ng-model');
                    element.removeAttr('readonly');
                    $compile(newelt)(scope);

                    if (!value) {
                        value = scope[model][field];
                    }
                    if (attrs.filter) {
                        var filterParts = attrs.filter.split(':');
                        var kind = filterParts[0];
                        filterParts.shift();
                        var format = filterParts.join(':').replace(/^["']|["']$/g, '');
                        if (dataType == 'date') {
                            /* Convert to number first so formatting will work */
                            value = Date.parse(value);
                        }
                        scope[model][field] = $filter(kind)(value, format);
                    } else if (type == 'date') {
                        /* Convert to RFC3399 date as required for HTML5 date input controls */
                        value = Date.parse(value);
                        value = $filter('date')(value, 'yyyy-MM-dd');
                        scope[model][field] = value;
                    }
                }
            });
        },
    }
});
