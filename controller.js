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
    displayRules(aclName, selectedSequence) {
        this.currentACL = aclName;
        this.moduleACL.getRules(aclName)
          .then((data) => this.renderList(data, selectedSequence));  // "() => this.method()"  is mandatory to preserve the reference to "this"
    }
    /**
     * Callback function to render the rule list once the rules are downloaded
     * @param {*} objRules 
     */
    renderList(objRules, selectedSequence) {
        var aclName = objRules.aclName;
        var rules = objRules.rules;
        this.renderer.renderRuleList(aclName, rules);
        if (selectedSequence != undefined) {
            this.renderer.markAsSelected(selectedSequence);
            //this.renderer.updatePanel(data);
        }
    }
   /**
    * Creates a new rule in the aclName ACL from the passed rule object
    * Then updates the displayed rule list
    * @param {*} aclName 
    * @param {*} rule 
    * */
    createOrUpdateRule(aclName, rule) {
        this.moduleACL.createOrUpdateRule(aclName, rule)
            .then((aclName) => {
                this.displayRules(aclName);
                this.clearPanel();
             } );
    }

   /**
    * Delete the passed rule from the aclName ACL
    * @param {*} aclName 
    * @param {*} rule 
    */
    deleteRule(aclName, rule) {
        this.moduleACL.deleteRule(aclName, rule)
            .then(
                (seq) => {
                    this.displayRules(this.currentACL);
                    this.clearPanel();
                    this.notifyDeleteRule(seq);
                });
    }
    /**
     * Callback function to notify the user after a rule deletion
     * @param {*} objRules 
     */
    notifyDeleteRule(sequence) {
       this.displayRules(this.currentACL)
       this.renderer.clearPanel();
       this.renderer.notifyDeleteRule(sequence);
    }

    /**
     * Clears the panel
     */
    clearPanel() {
        this.renderer.clearPanel();
    }
    
    /**
     * Generic Controller callback function
     * This function is designed to keep the controler reference to "this" then.
     * @param {*} fct 
     * @param {*} param 
     */
    /*
    callback(fct, param) {
        this[fct](param);
    }
    */
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
        this.moduleACL.shiftRowsFromSequenceNumber(aclName, rowNb, sequenceNb)
            .then((aclName) => {
                this.displayRules(aclName, sequenceNb + rowNb);
                }
            );
    }
};

export { Controller };