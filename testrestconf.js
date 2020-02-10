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
 * The Model creates the Controller.
 * The Controller creates the Renderer.
 * 
 */

class ModuleACL {
    constructor(scheme, hostname, apiPath) {
        this.scheme = scheme;
        this.hostname = hostname;
        this.apiPath = apiPath;
        this.baseURL = scheme + hostname + apiPath;
        this.aclConfig = "netgate-acl:acl-config";
        this.aclTable = "netgate-acl:acl-table";
        this.aclList = "netgate-acl:acl-list";
        this.aclListParam = "{acl-name}";
        this.aclRuleParam = "{sequence}";
        this.aclRules = "netgate-acl:acl-rules";
        this.aclRule = "netgate-acl:acl-rule";
        this.aclConfigURL = this.baseURL + "/data/" + this.aclConfig;
        this.aclTableURL = this.aclConfigURL + "/" + this.aclTable;
        this.aclListURL = this.aclTableURL + "/" + this.aclList + "=" + this.aclListParam;
        this.aclRulesURL = this.aclListURL + "/" + this.aclRules;
        this.aclRuleURL = this.aclRulesURL + "/" + this.aclRule + "=" + this.aclRuleParam;
        // https://docs.netgate.com/tnsr/en/latest/api/netgate-acl.html#tag/acl-config/paths/~1data~1netgate-acl:acl-config~1netgate-acl:acl-table~1netgate-acl:acl-list={acl-name}~1netgate-acl:acl-rules~1netgate-acl:acl-rule={sequence}/post
        this.ruleTemplate = {
            "sequence": 0,
            "acl-rule-description": "string",
            "action": "deny",
            "ip-version": "unknown",
            "protocol": "string",
            "src-ip-prefix": "string",
            "src-first-port": 0,
            "src-last-port": 0,
            "dst-ip-prefix": "string",
            "dst-first-port": 0,
            "dst-last-port": 0,
            "tcp-flags-mask": 0,
            "tcp-flags-value": 0,
            "icmp-first-code": 0,
            "icmp-last-code": 0,
            "icmp-first-type": 0,
            "icmp-last-type": 0
        };
        this.controller = new Controller(this);
        this.sequences = {};
    }

    /**
     * Stores the current sequence numbers in an array
     * @param {*} aclName 
     * @param {*} list 
     */
    storeSequences(aclName, list) {
        var sequences = [];
        var rules = list[this.aclRules]["acl-rule"];
        for (var i = 0; i < rules.length; i++) {
            var seq = rules[i]["sequence"];
            sequences.push(seq);
        }
        this.sequences[aclName] = sequences;
    }

    /**
     * Gets the current rules from the aclName ACL
     * * As it runs as a promise, 2 callback functions are passed to be executed once the rules are got (or not)
     * @param {*} aclName 
     * @param fulfilled the function from the controller to be executed once the rules are got : fulfilled(result)
     * @param rejected the function from the controller to be executed in case of error
     */
    getRules(aclName, fulfilled, rejected) {
        var url = this.aclRulesURL.replace(this.aclListParam, aclName);
        var that = this;
        this.request("GET", url)
            .then(function(req) {
                var rules = JSON.parse(req.responseText);
                that.storeSequences(aclName, rules);
                if (fulfilled) {
                    var returned = {
                        aclName: aclName,
                        rules: rules
                    }
                    that.controller.callback(fulfilled, returned);
                }  
            })
            .catch(function(error) {
                console.log("error", error);
                if (rejected) {
                    that.controller.callback(rejected, error);
                }
            });
    }

    /**
     * Creates a new rule in the aclName ACL from the passed rule object
     * As it runs as a promise, 2 callback functions are passed to be executed once the rule is created are got (or not)
     * @param {*} aclName 
     * @param {*} rule 
     * @param fulfilled the function from the controller to be executed once the rule is created/updated : fulfilled(result)
     * @param rejected the function from the controller to be executed in case of error
     */
    createOrUpdateRule(aclName, rule, fulfilled, rejected) {
        var sequence = rule["sequence"];
        if (sequence == undefined) { 
            return;
        }
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);
        var objRule = {"netgate-acl:acl-rule" : rule}
        var body = JSON.stringify(objRule);
        this.request("PUT", url, body)
         .then(function(req) {
            that.getRules(aclName, fulfilled, rejected);
         })
         .catch(function(error) {
             console.log("error", error);
             if (rejected) {
                that.controller.callback(rejected, error);
            }
         })
    }

    // TEST POST
    testCreate(aclName, rule) {
        var sequence = rule["sequence"];
        if (sequence == undefined) { 
            return;
        }
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);
        var objRule = {"netgate-acl:acl-rule" : rule}
        var body = JSON.stringify(objRule);
        this.request("POST", url, body)
         .then(function(req) {
            that.getRules(aclName);
            that.renderer.clearPanel();
         })
         .catch(function(error) {
             console.log("error", error);
         })
    }

    /**
     * Delete the passed rule from the aclName ACL
    * As it runs as a promise, 2 callback functions are passed to be executed once the rule is created are got (or not)
     * @param {*} aclName 
     * @param {*} rule 
     * @param fulfilled the function from the controller to be executed once the rule is deleted : fulfilled(result)
     * @param rejected the function from the controller to be executed in case of error
     */
    deleteRule(aclName, rule, fulfilled, rejected) {
        var sequence = rule["sequence"];
        if (sequence == undefined) {
            return;
        }
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);
        this.request("DELETE", url)
        .then(function(req) {
           that.controller.callback(fulfilled, sequence);
        })
        .catch(function(error) {
            console.log("error", error);
            if (rejected) {
                that.controller.callback(rejected, error);
            }
        })
    }
    /**
     * Sends the REST request : GET, POST, PUT or DELETE
     * @param {*} method 
     * @param {*} url 
     * @param {*} body 
     */
    // https://gomakethings.com/promise-based-xhr/
    request(method, url, body) {
        var request = new XMLHttpRequest();
        return new Promise( 
                function(resolve, reject) {
                request.onreadystatechange = function () {
                    // Only run if the request is complete
                    if (request.readyState !== 4) return;
                    // Process the response
                    if (request.status >= 200 && request.status < 300) {
                        // If successful
                        resolve(request);
                    } else {
                        // If failed
                        reject({
                            status: request.status,
                            statusText: request.statusText
                        });
                    }
                };
                // Setup our HTTP request
                request.open(method || 'GET', url, true);
                request.setRequestHeader('Content-type','application/yang-data+json; charset=utf-8');
                // Send the request
                request.send(body);
            } 
        );
    };
    
    /**
     * Returns true if the passed value belongs to the rule sequence list
     * @param {*} aclName 
     * @param {*} sequenceValue 
     */
    isInRuleSequences(aclName, sequenceValue) {
        var sequences = this.sequences[aclName];
        var index = sequences.indexOf(sequenceValue);
        return (index > -1);
    }


};

class Renderer {
    constructor(moduleACL) {
        this.moduleACL = moduleACL;
        this.aclRules = this.moduleACL.aclRules;
        this.ruleTemplate = this.moduleACL.ruleTemplate;
        this.htmlACLElement = document.querySelector("#acls");
        this.htmlPanelElement = document.querySelector("#panel");
        this.panelFields = {};
        this.currentACL = "";
        if (this.moduleACL.controller) {
            this.controller = this.moduleACL.controller;
        }

        this.createPanel();
    }
    /**
     * Displays the the rule list
     * @param {*} aclName 
     * @param {*} list 
     */
    renderRuleList(aclName, list) {
        var content = "";
        if (!list) {
            content = "Erreur : liste d'ACL demandée non trouvée";
        }
        else {
            var rules = list[this.aclRules]["acl-rule"];
            var ruleTemplate = this.ruleTemplate;
            content = "<h3>ACL name : " + aclName + "</h3>";
            content = content + "<table class='result'><tr>";
            for (var property in ruleTemplate) {
                content = content + "<th>" + property + "</th>";
            }
            content = content + '</tr>';
            for (var i = 0; i < rules.length; i++) {
                var styl = (i % 2 == 0) ? "odd" : "even";
                var rule = rules[i];
                content = content + "<tr class='" + styl + "'>";
                for (var prop in ruleTemplate) {
                    var data = "";
                    if (rule[prop]) {
                        data = rule[prop];
                    }
                    content = content + "<td data-property='" + prop + "'>" + data + "</td>";
                }
                content = content + "</tr>";
            }
            content = content + "</table>";

        }
        this.htmlACLElement.innerHTML = content;
        this.currentACL = aclName;

        var that = this;
        this.htmlACLElement.onclick = function(evt) {
            that.unselectAll();
            var elem = evt.target;
            var row = elem.parentNode;
            if (elem.nodeName == "TD" && row.nodeName == "TR") {
                row.classList.add("selected");
                var children = row.children;
                var data = {};
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    var property = child.dataset.property;
                    var value = child.innerText;
                    data[property] = value;
                }
                that.updatePanel(data)
            }
        };
    }

    /**
     * Populates the panel for rule creation, update or deletion
     */
    createPanel() {
        var content = "";
        var ruleTemplate= this.ruleTemplate;
        var nbPerLine = 6;
        var i = 1;
        
        for (var p in ruleTemplate) {
            var label = "<label for='" + p + "'>" + p + " : </label>";
            var input = "<input type='text' id='" + p + "' name='" + p + "' style='width:2em'>&nbsp;&nbsp;&nbsp;&nbsp;";
            var field = label + input;
            content = content + field;
            if (i % nbPerLine == 0) {
                content = content + "<br>";
            }
            i++;
        }
        content = content + "<br><br><button type='button' id='buttoncreateOrUpdateRule'>Update or Create Rule</button>";
        content = content + "&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' id='buttonClearPanel'>Clear</button>";
        content = content + "&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' id='buttonDeleteRule'>Delete Rule</button>";
        content = content + "&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' id='buttonShift'>Shift From Selected Rule</button>";

        // Test
        content = content + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' id='buttonTest'>Test POST</button>";
        this.htmlPanelElement.innerHTML = content;

        var panelFields = this.panelFields;
        for (var p  in ruleTemplate) {
            var htlmField = document.querySelector("#" + p);
            panelFields[p] = htlmField;
        }

        var that = this;
        var htmlClear = document.querySelector("#buttonClearPanel");
        htmlClear.onclick = function() {
            that.clearPanel();
            that.unselectAll();
        }

        var htmlCreateButton = document.querySelector("#buttoncreateOrUpdateRule");
        htmlCreateButton.onclick = function() { 
            var parsed = that.parsePanelFields();
            var aclName = that.currentACL;
            if (parsed) {
                var seq = parsed["sequence"];
                if (that.controller.isInRuleSequences(aclName, seq) && that.confirmUpdateRule(seq)) { // if the sequence number exists, we're about to update an existing rule
                }
                that.controller.createOrUpdateRule(aclName, parsed);
            }
         };

         var htmlDeleteButton = document.querySelector("#buttonDeleteRule");
         htmlDeleteButton.onclick = function() {
             var parsed = that.parsePanelFields(true);
             var aclName = that.currentACL;
             if (parsed) {
                 if (that.confirmDeleteRule(parsed["sequence"])) {
                    that.controller.deleteRule(aclName, parsed);
                 }
             }
         }

         var htmlShiftButton = document.querySelector("#buttonShift");
         htmlShiftButton.onclick = function() { 
             var parsed = that.parsePanelFields(true);
             var aclName = that.currentACL;
             if (parsed) {
                 var seq = parsed["sequence"];
                 if (that.controller.isInRuleSequences(aclName, seq)) { // if the sequence number exists, we're about to update an existing rule
                 }
                 that.controller.shiftRowsFromSequenceNumber(aclName, 1, seq);
             }
          };
         // TEST
         var htmlTestButton = document.querySelector("#buttonTest");
         htmlTestButton.onclick = function() { 
             var parsed = that.parsePanelFields();
             var aclName = that.currentACL;
             if (parsed) {
                 var seq = parsed["sequence"];
                 if (that.controller.isInRuleSequences(aclName, seq) && that.confirmUpdateRule(seq)) { // if the sequence number exists, we're about to update an existing rule
                 }
                 that.moduleACL.testCreate(aclName, parsed);
             }
          };


    }

    /**
     * Parses the panel field values and returns an object in the expected format or null
     * @param {boolean} checkOnlySequence true if the value type check must be done only on the sequence value
     */
    parsePanelFields(checkOnlySequence) {
        var data = this.panelFields;
        var ruleTemplate = this.ruleTemplate;
        var parsed = {};
        var size = 0;
        for (var p in data) {
            var value = data[p].value;
            if (value != "") {                  // is some value was submitted
                if (ruleTemplate[p] == 0) {     // all values are string by default, so check if need for casting to int
                    var numval = parseInt(value);
                    if (!isNaN(numval)) {
                        parsed[p] = numval;
                        size++;
                    }
                }
                else {
                    parsed[p] = value;
                    size++;
                }
            }
        }
        var ipVersion = parsed["ip-version"];
        var testIpversion = (ipVersion == "unknown" || ipVersion == "ipv4" || ipVersion == "ipv6");
        var action = parsed["action"];
        var testAction = (action == "deny" || action == "permit" || action == "reflect");
        var testSequence = (parsed["sequence"] != undefined);
        var testMandatory = testSequence;
        if (!checkOnlySequence) {
            testMandatory = (testSequence && testAction && testIpversion);
        }
        if (size > 0 && testMandatory) {
            return parsed;
        }
        var alerttMsg = "ERROR : \n\n";
        if (!testSequence) { 
            alerttMsg = alerttMsg + "- Sequence number is missing.\n\n"; 
        }
        if (!testAction && !checkOnlySequence) {
            alerttMsg = alerttMsg + "- action must be : \"deny\", \"permit\" or \"reflect\".\n\n";
        }
        if (!testIpversion && !checkOnlySequence) {
            alerttMsg = alerttMsg + "- ip-version must be : \"unknown\", \"ipv4\" or \"ipv6\".\n";
        }
        alert(alerttMsg);
        return null;
    }
    /**
     * Clears the panel fields
     */
    clearPanel() {
        var fields = this.panelFields;
        for (var f in fields) {
            var field = fields[f];
            field.value = "";
        }
    }

    /**
     * Sets the panel fields with  the data object values
     * @param {*} data 
     */
    updatePanel(data) {
        this.clearPanel();
        var fields = this.panelFields;
        for (var p in fields) {
            var elem = fields[p];
            elem.value = data[p];           
        }
    }

    /**
     * Unselect the currently selected rule in the rule list
     */
    unselectAll() {
        var htmlACLElement = this.htmlACLElement;
        var selectedItems = htmlACLElement.querySelectorAll(".selected");
        for (var i = 0; i < selectedItems.length; i++) {
            selectedItems[i].classList.remove("selected");
        }
    }
    /**
     * Notifies that a rule has just been deleted
     * @param {*} sequence 
     */
    notifyDeleteRule(sequence) {
        window.alert("Rule " + sequence + " succesfully deleted.");
    }
    /**
     * Asks confirmation for rule deletion
     * @param {*} sequence 
     */
    confirmDeleteRule(sequence) {
        var confirm = window.confirm("Delete rule sequence number " + sequence + " ?");
        return confirm;
    }
    /**
     * Asks confirmation for rule update
     * @param {*} sequence 
     */
    confirmUpdateRule(sequence) {
        var confirm = window.confirm("About to update rule number " + sequence + " ?");
        return confirm;
    }

};


 class Controller {
     constructor(moduleACL) {
        this.moduleACL = moduleACL;
        this.renderer = new Renderer(moduleACL);
        this.renderer.controller = this;
        this.currentACL = "";
     }
     /**
      * Displays the rules of the aclName ACL
      */
     displayRules(aclName) {
         this.currentACL = aclName;
         this.moduleACL.getRules(aclName, "renderList");
     }
     /**
      * Callback function to render the rule list once the rules are downloaded
      * @param {*} objRules 
      */
     renderList(objRules) {
         var aclName = objRules.aclName;
         var rules = objRules.rules;
         this.renderer.renderRuleList(aclName, rules);
     }
    /**
     * Creates a new rule in the aclName ACL from the passed rule object
     * @param {*} aclName 
     * @param {*} rule 
     * */
     createOrUpdateRule(aclName, rule) {
         this.moduleACL.createOrUpdateRule(aclName, rule, "renderListAndClearPanel");
     }
     /**
      * Callback function to render the rule list once the rules are downloaded, then to clear the panel
      * @param {*} objRules 
      */
     renderListAndClearPanel(objRules) {
         this.renderList(objRules);
         this.renderer.clearPanel();
     }
    /**
     * Delete the passed rule from the aclName ACL
     * @param {*} aclName 
     * @param {*} rule 
     */
     deleteRule(aclName, rule) {
         this.moduleACL.deleteRule(aclName, rule, "notifyDeleteRule");

     }/**
      * Callback function to notify the user after a rule deletion
      * @param {*} objRules 
      */
     notifyDeleteRule(sequence) {
        this.displayRules(this.currentACL)
        this.renderer.clearPanel();
        this.renderer.notifyDeleteRule(sequence);
     }

     /**
      * Generic Controller callback function
      * This function is designed to keep the controler reference to "this" then.
      * @param {*} fct 
      * @param {*} param 
      */
     callback(fct, param) {
         this[fct](param);
     }
     /**
      * Returns true if the passed sequence number is in the aclName rule list
      * @param {*} aclName 
      * @param {*} sequence 
      */
     isInRuleSequences(aclName, sequence) {
         return this.moduleACL.isInRuleSequences(aclName, sequence);
     }
     /**
      * Shifts the rule sequence numbers for rowNb from the passed sequence number.
      * All the rules following the passed sequence number are shifted until a free space is found before the next seq number
      * @param {*} rowNb 
      * @param {*} sequenceNb 
      */
     shiftRowsFromSequenceNumber(aclName, rowNb, sequenceNb) {
         this.moduleACL.getRules(aclName);
         var sequences = this.moduleACL.sequences[aclName];
         var start = sequences.indexOf(sequenceNb);         // assuming it's up to date
         if (start >= 0) {
             var end = start;
             if (sequences.length > 1) {
                while (end < sequences.length && (sequences[end] - sequences[start] <= rowNb)) {
                    end++;
                }
             }
         }
         this.displayRules(aclName);
     }
 };

 /**
 * Init script
 */
var init = function() {
    var apiScheme = "https://";
    var apiPath = "/restconf";
    var hostname = window.location.hostname;

    var myACL = new ModuleACL(apiScheme, hostname, apiPath);
    myACL.controller.displayRules("test");
    //myACL.getRules("test")
};