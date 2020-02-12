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

        var that = this;
        this.htmlACLElement.addEventListener('click', function(evt) {
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
        }, true);  // use capture for manually dispatched events

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
                    var propSeq = "";
                    if (prop == "sequence") {
                        propSeq = " data-sequence='" + data + "'";
                    }
                    content = content + "<td data-property='" + prop + "'" + propSeq + ">" + data + "</td>";
                }
                content = content + "</tr>";
            }
            content = content + "</table>";

        }
        this.htmlACLElement.innerHTML = content;
        this.currentACL = aclName;
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
     * Mark the rule as selected
     */
    markAsSelected(seqNumber) {
        var htmlACLElement = this.htmlACLElement;
        var elemWithSequences = htmlACLElement.querySelectorAll('[data-sequence]');
        var i = 0;
        var strSeq = String(seqNumber);
        var elem;
        while (i < elemWithSequences.length) {
            elem = elemWithSequences[i];
            if (elem.dataset.sequence == strSeq) {
                break;
            }
            i++;
        }
        var click = new Event('click');
        elem.dispatchEvent(click);
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

export { Renderer };