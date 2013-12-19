/*
    ${NAME} Controller
 */
#include "esp.h"

${ACTIONS}

ESP_EXPORT int esp_controller_${APP}_${NAME}(HttpRoute *route, MprModule *module) {
    ${DEFINE_ACTIONS}    
    return 0;
}
