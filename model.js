import {Controller} from './controller.js';

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
        this.rules = undefined;
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
     * Returns the rule from the stored rules
     * @param {*} sequence 
     */
    ruleFromList(sequence) {
        var rules = this.rules;
        if (rules) {
            var ruleList = rules[this.aclRules]["acl-rule"];
            for (var i = 0; i < ruleList.length; i++) {
                var rule = ruleList[i];
                if (rule.sequence == sequence) {
                    return rule;
                }
            } 
        }
        return null;
    }

    /**
     * Gets the current rules from the aclName ACL
     * Returns a promise
     * @param {*} aclName 
     */
    getRules(aclName) {
        var url = this.aclRulesURL.replace(this.aclListParam, aclName);
        var that = this;
        return new Promise(
            function(resolve, reject) {
                that.request("GET", url)
                .then(function(req) {
                    var rules = JSON.parse(req.responseText);
                    that.rules = rules;
                    that.storeSequences(aclName, rules);
                    var returned = {
                        aclName: aclName,
                        rules: rules
                    }
                    resolve(returned);
                })
                .catch(function(error) {
                    console.log("error in getRules() : ", error);
                    reject(error);
                });
            }
        );
    }

    /**
     * Creates a new rule in the aclName ACL from the passed rule object
     * Returns a promise
     * @param {*} aclName 
     * @param {*} rule 
     */
    createOrUpdateRule(aclName, rule) {
        var sequence = rule["sequence"];
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);
        var objRule = {"netgate-acl:acl-rule" : rule}
        var body = JSON.stringify(objRule);
        return new Promise(
            function(resolve, reject) {
                that.request("PUT", url, body)
                    .then(function(req) {
                        resolve(aclName);
                })
                .catch(function(error) {
                    console.log("error in CreateOrUpdateRule() : ", error);
                    reject(error);
                });
            }
        )
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
     * Returns a promise
     * @param {*} aclName 
     * @param {*} rule 
     */
    deleteRule(aclName, rule) {
        var sequence = rule["sequence"];
        var that = this;
        var url = this.aclRuleURL.replace(this.aclListParam, aclName).replace(this.aclRuleParam, sequence);
        return new Promise(
            function(resolve, reject) {
                that.request("DELETE", url)
                    .then(function(req) {
                        resolve(sequence);
                })
                .catch(function(error) {
                    console.log("error in deleteRule() : ", error);
                        reject(error);
                })
            }
        )
    }
    /**
     * Sends the REST request : GET, POST, PUT or DELETE
     * Returns a promise
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
                            statusText: request.statusText,
                            response: JSON.parse(request.response)
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

    /**
     * Shifts the rule sequence numbers for rowNb from the passed sequence number.
     * All the rules following the passed sequence number are shifted until a free space is found before the next seq number
     * @param {*} rowNb 
     * @param {*} sequenceNb 
     */
    shiftRowsFromSequenceNumber(aclName, rowNb, sequenceNb) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getRules(aclName)
                .then(() => {
                    var sequences = that.sequences[aclName]; 
                    var startIndex = sequences.indexOf(sequenceNb);  
                    var finalIndex = startIndex;       
                    if (startIndex >= 0) {
                        var next = finalIndex + 1;
                        if (sequences.length > 1) {
                            while (next < sequences.length && (sequences[next] - sequences[finalIndex] <= rowNb)) {
                                finalIndex++;
                                next++;
                            }
                        }
                        // Store promises
                        var operations = [];
                        var parameters = [];
                        for (var i = finalIndex; i >= startIndex; i--) {
                            var seq = sequences[i];
                            var rule = that.ruleFromList(seq);
                            var param = {
                                seq: rule.sequence,
                                rule: rule,
                                aclName: aclName
                            };
                            var opCreate = (param) => { 
                                var rule = param.rule;
                                var aclName = param.aclName;
                                rule.sequence = param.seq + 1;
                                that.createOrUpdateRule(aclName, rule); 
                            };
                            var opDelete = (param) => { 
                                var rule = param.rule;
                                rule.sequence = param.seq;
                                var aclName = param.aclName;
                                that.deleteRule(aclName, rule); 
                             };
                            operations.push(opCreate, opDelete);
                            parameters.push(param, param);
                        }
                        var callback = () => resolve(aclName);
                        that.chainPromises(operations, parameters, callback);
                        
                    }    
                });
        });
    }

    /**
     * Executes sequentially the promises in the array by passing them the parameters of the second array
     * Then runs the callback function if any
     * @param {*} promises 
     * @param {*} parameters 
     * @param {*} callback 
     */

    async chainPromises(promises, parameters, callback) {
        // then execute them sequentially
        for (var p = 0; p < promises.length; p++) {
            var promise = promises[p];
            var param = parameters[p];
            await promise(param);
        }
        if (callback) {
            callback();
        }
    }
};

export { ModuleACL };