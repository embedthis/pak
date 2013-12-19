/*
    Browser Controller
 */
#include "esp.h"

static void dashBrowser() { 
    //  TODO - send home page data
    sendResult(updateRec(createRec("catalog", params())));
}

static void lookupBrowser() { 
    cchar   *keywords;

    keywords = param("keywords");
    sendRec(readRec("catalog", param("id")));
}


ESP_EXPORT int esp_controller_catalog_browser(HttpRoute *route, MprModule *module) {
    espDefineAction(route, "browser-cmd-dash", dashBrowser);
    espDefineAction(route, "browser-cmd-lookup", lookupBrowser);
    
#if SAMPLE_VALIDATIONS
    Edi *edi = espGetRouteDatabase(route);
    ediAddValidation(edi, "present", "catalog", "title", 0);
    ediAddValidation(edi, "unique", "catalog", "title", 0);
    ediAddValidation(edi, "banned", "catalog", "body", "(swear|curse)");
    ediAddValidation(edi, "format", "catalog", "phone", "/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/");
#endif
    return 0;
}
