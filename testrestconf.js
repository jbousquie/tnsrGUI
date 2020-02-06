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
        this.renderer = new Renderer(this);
        this.sequences = {};
    }

    storeSequences(aclName, list) {
        var sequences = [];
        var rules = list[this.aclRules]["acl-rule"];
        for (var i = 0; i < rules.length; i++) {
            var seq = rules[i]["sequence"];
            sequences.push(seq);
        }
        this.sequences[aclName] = sequences;
    }

    getRules(aclName) {
        var url = this.aclRulesURL.replace(this.aclListParam, aclName);
        var renderer = this.renderer;
        var that = this;
        this.request("GET", url)
            .then(function(req) {
                var rules = JSON.parse(req.responseText);
                that.storeSequences(aclName, rules);
                renderer.renderRuleList(aclName, rules);
            })
            .catch(function(error) {
                console.log("error", error);
            });
    }

    createOrUpdateRule(aclName, rule) {
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
            that.getRules(aclName);
            that.renderer.clearPanel();
         })
         .catch(function(error) {
             console.log("error", error);
         })
    }

    deleteRule(aclName, rule) {
        var sequence = rule["sequence"];
        if (sequence == undefined) {
            return;
        }
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);

        console.log(url)
        this.request("DELETE", url)
        .then(function(req) {
           that.getRules(aclName);
           that.renderer.clearPanel();
           that.renderer.notifyDeleteRule(sequence);
        })
        .catch(function(error) {
            console.log("error", error);
        })
    }
    // Sends the http request
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
    
    // returns true if the passed value belongs to the rule sequence list
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

        this.createPanel();
    }

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

    // Populates the panel for rule creation
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
                if (that.moduleACL.isInRuleSequences(aclName, seq) && that.confirmUpdateRule(seq)) { // if the sequence number exists, we're about to update an existing rule
                }
                that.moduleACL.createOrUpdateRule(aclName, parsed);
            }
         };

         var htmlDeleteButton = document.querySelector("#buttonDeleteRule");
         htmlDeleteButton.onclick = function() {
             var parsed = that.parsePanelFields(true);
             var aclName = that.currentACL;
             if (parsed) {
                 if (that.confirmDeleteRule(parsed["sequence"])) {
                    that.moduleACL.deleteRule(aclName, parsed);
                 }
             }
         }
    }

    // Parses the panel field values and returns an object in the expected format or null
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

    clearPanel() {
        var fields = this.panelFields;
        for (var f in fields) {
            var field = fields[f];
            field.value = "";
        }
    }

    updatePanel(data) {
        this.clearPanel();
        var fields = this.panelFields;
        for (var p in fields) {
            var elem = fields[p];
            elem.value = data[p];           
        }
    }

    unselectAll() {
        var htmlACLElement = this.htmlACLElement;
        var selectedItems = htmlACLElement.querySelectorAll(".selected");
        for (var i = 0; i < selectedItems.length; i++) {
            selectedItems[i].classList.remove("selected");
        }
    }

    notifyDeleteRule(sequence) {
        window.alert("Rule " + sequence + " succesfully deleted.");
    }
    confirmDeleteRule(sequence) {
        var confirm = window.confirm("Delete rule sequence number " + sequence + " ?");
        return confirm;
    }
    confirmUpdateRule(sequence) {
        var confirm = window.confirm("About to update rule number " + sequence + " ?");
        return confirm;
    }

};

var init = function() {
    var apiScheme = "https://";
    var apiPath = "/restconf";
    var hostname = window.location.hostname;

    var myACL = new ModuleACL(apiScheme, hostname, apiPath);
    myACL.getRules("test")
};