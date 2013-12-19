/*
    esp-input-group.js - ESP esp-input-group directive

    Attributes:
        classes="Class,Class,..."       Ordered list of CSS classes for the outer division wrapping the esp-input
        fields="Title,Title,..."        Ordered list of fields to render. Default to all fields of schema.
        filters="filter,filter,..."     Ordered list of field filters.
        inputClasses="Class,Class,..."  Ordered list of input field CSS classes
        labels="Name,Name,..."          Ordered list of input field labels
        labelClasses="Class,Class,..."  Ordered list of input field label CSS classes
        ng-model="MODEL"                Angular model object name
        types="type,type,..."           Ordered list of input control types (checkbox,radiobox,text,textarea, ...)

    Emits esp-input elements for each field in the schema
 */
angular.module('esp.input-group', [])
.directive('espInputGroup', function(Esp, $compile, $rootScope) {
    return {
        restrict: 'E',
        replace: true,
        link: function (scope, element, attrs) {
            var model = attrs.ngModel;
            scope.$watch('schema', function (val) {
                if (scope.schema) {
                    if (element.children().length == 0) {
                        var attributes = "";
                        angular.forEach(attrs.$attr, function(value, key){
                            if (value == 'ng-model') return;
                            attributes += ' ' + value + '="' + attrs[key] + '"';
                        });
                        var fields = scope.schema.columns;
                        if (attrs.fields) {
                            fields = attrs.fields.split(',');
                        }
                        var labels;
                        if (attrs.labels) {
                            labels = attrs.labels.split(',');
                        }
                        var classes;
                        if (attrs.classes) {
                            classes = attrs.classes.split(',');
                        }
                        var types;
                        if (attrs.types) {
                            types = attrs.types.split(',');
                        }
                        var filters;
                        if (attrs.filters) {
                            filters = attrs.filters.split(',');
                        }
                        var inputClasses;
                        if (attrs.inputClasses) {
                            inputClasses = attrs.inputClasses.split(',');
                        }
                        var labelClasses;
                        if (attrs.labelClasses) {
                            labelClasses = attrs.labelClasses.split(',');
                        }
                        angular.forEach(fields, function(field, key) {
                            var i = 0 + key;
                            var label = 'label="' + ((labels && labels[i]) ? labels[i] : Esp.titlecase(field)) + '"';
                            var klass = (classes && classes[i]) ? ('class=' + classes[i]) : '';
                            var type = (types && types[i]) ? ('type="' + types[i] + '"') : '';
                            var filter = (filters && filters[i]) ? ('filter="' + filters[i] + '"') : '';
                            var inputClass = (inputClasses && inputClasses[i]) ? ('inputClass="' + inputClasses[i] + '"') : '';
                            var labelClass = (labelClasses && labelClasses[i]) ? ('labelClass="' + labelClasses[i] + '"') : '';
                            var thisAtt = attributes + ' ng-model="' + model + '.' + field + '"';
                            var html = '<esp-input' + thisAtt + ' ' + type + ' ' + label + ' ' + labelClass + ' ' +
                                filter + ' ' + klass + '>\n';
                            var newelt = angular.element(html);
                            element.append(newelt);
                            $compile(newelt)(scope);
                            element.removeAttr('class');
                        });
                    }
                }
            });
        },
    }
});
