import { Renderer } from './renderer.js';

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
        // this.moduleACL.getRules(aclName);
        var sequences = this.moduleACL.sequences[aclName]; // assuming it's up to date
        var start = sequences.indexOf(sequenceNb);         
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

export { Controller };