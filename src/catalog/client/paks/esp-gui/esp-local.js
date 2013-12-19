/*
    esp-local.js - Local storage service
 */
'use strict';

angular.module('esp.local', [])
.factory('LocalStore', function() {
    return {
        get: function (key) {
            return JSON.parse(localStorage.getItem(key) || '[]');
        },
        put: function (key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        remove: function (key) {
            localStorage.removeItem(key);
        }
    };
});
