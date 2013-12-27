/*
    pak.js - Pak model
 */
'use strict';

angular.module('app').factory('Pak', function (EspResource) {
    return EspResource.group("pak", {}, {
        'retract': { 'method': 'POST', url: '/:prefix/:controller/retract' },
        'publish': { 'method': 'POST', url: '/:prefix/:controller/publish' },
        'search':  { 'method': 'POST', url: '/:prefix/:controller/search' },
    });
});
