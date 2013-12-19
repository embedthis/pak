/*
    esp-session.js - Client side session storage service
 */
'use strict';

angular.module('esp.session', [])
.factory('SessionStore', function() {
    return {
        get: function (key) {
            return JSON.parse(sessionStorage.getItem(key) || '[]');
        },
        put: function (key, value) {
            sessionStorage.setItem(key, JSON.stringify(value));
        },
        remove: function (key, value) {
            sessionStorage.removeItem(key);
        }
    };
});
