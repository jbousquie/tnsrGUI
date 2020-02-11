/**
 * TNSR Web GUI
 * ACL edition only
 * MVC pattern : 
 *   ModuleACL class is the Model
 *   Controller class is the Controller
 *   Renderer class is the View
 * 
 * Decoupling :
 * The client must call only controller methods directly.
 * The controller can call Model or View methods.
 * The controller and the view don't communicate between them, they only call controller methods when needed.
 * 
 * The Model imports and creates the Controller.
 * The Controller imports and creates the Renderer.
 * This main script imports and creates the Model "ModuleACL".
 * 
 */

import { ModuleACL } from './model.js';


 /**
 * Init script
 */
var init = function() {
    var apiScheme = "https://";
    var apiPath = "/restconf";
    var hostname = window.location.hostname;

    var myACL = new ModuleACL(apiScheme, hostname, apiPath);
    myACL.controller.displayRules("test");
};

// Run init script
window.onload = init;
