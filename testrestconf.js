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
        this.aclRules = "netgate-acl:acl-rules";
        this.aclRule = "netgate-acl:acl-rule";
        this.aclConfigURL = this.baseURL + "/data/" + this.aclConfig;
        this.aclTableURL = this.aclConfigURL + "/" + this.aclTable;
        this.aclListURL = this.aclTableURL + "/" + this.aclList + "=" + this.aclListParam;
        this.aclRulesURL = this.aclListURL + "/" + this.aclRules;
        this.ruleTemplate = {
            "src-last-port": 0,
            "icmp-first-code": 0,
            "icmp-last-code": 0,
            "acl-rule-description": "string",
            "icmp-first-type": 0,
            "tcp-flags-mask": 0,
            "ip-version": "unknown",
            "src-first-port": 0,
            "sequence": 0,
            "protocol": "string",
            "dst-last-port": 0,
            "dst-ip-prefix": "string",
            "action": "deny",
            "tcp-flags-value": 0,
            "src-ip-prefix": "string",
            "icmp-last-type": 0,
            "dst-first-port": 0
        
        };
        this.renderer = new Renderer(this);
    }

    getRules(aclName) {
        var url = this.aclRulesURL.replace(this.aclListParam, aclName);
        var renderer = this.renderer;
        this.request("GET", url)
            .then(function(req) {
                var rules = JSON.parse(req.responseText);
                renderer.renderRuleList(rules);
            })
            .catch(function(error) {
                console.log("error", error);
            });
    }

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
                // Send the request
                request.send();
            } 
        );
    };
    

};

class Renderer {
    constructor(moduleACL) {
        this.moduleACL = moduleACL;
        this.aclRules = this.moduleACL.aclRules;
        this.ruleTemplate = this.moduleACL.ruleTemplate;
        this.htmlACLElement = document.querySelector("#acls");
    }

    renderRuleList(list) {
        var rules = list[this.aclRules]["acl-rule"];
        var ruleTemplate = this.ruleTemplate;
        var content = "<table class='result'><tr>";
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
                content = content + "<td>" + data + "</td>";
            }
            content = content + "</tr>";
        }
        content = content + "</table>";
        this.htmlACLElement.innerHTML = content;
    }
};

var init = function() {
    var apiScheme = "https://";
    var apiPath = "/restconf";
    var hostname = window.location.hostname;

    var myACL = new ModuleACL(apiScheme, hostname, apiPath);
    myACL.getRules("test")
};