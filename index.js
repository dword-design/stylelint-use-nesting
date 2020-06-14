'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var stylelint = _interopDefault(require('stylelint'));
var postcss = _interopDefault(require('postcss'));

function is(value, ...keys) {
  const length = keys.length;
  const matches = keys.pop();
  const subvalue = keys.reduce((result, key) => Object(result)[key], value);
  return length ? [].concat(matches).some(match => match instanceof RegExp ? match.test(subvalue) : match === subvalue) : Boolean(value);
}

function areRulesPotentialNestingAtRule(rule1, rule2, opts) {
  const except = [].concat(Object(opts).except || []);
  const only = [].concat(Object(opts).only || []);
  return rule1.selectors && rule2.selectors && rule2.selectors.every(rule2Selector => rule1.selectors.every(rule1Selector => rule2Selector.length < rule1Selector.length && ` ${rule2Selector}` === rule1Selector.slice(-rule2Selector.length - 1) && (!except.length || except.some(entry => entry instanceof RegExp ? !entry.test(rule1Selector.slice(0, -rule2Selector.length - 1)) : entry !== rule1Selector.slice(0, -rule2Selector.length - 1))) && (!only.length || only.some(entry => entry instanceof RegExp ? entry.test(rule1Selector.slice(0, -rule2Selector.length - 1)) : entry === rule1Selector.slice(0, -rule2Selector.length - 1)))));
}

function areRulesPotentialNestingMediaRule(rule1, rule2, opts) {
  const except = [].concat(Object(opts).except || []);
  const only = [].concat(Object(opts).only || []);
  const isRule2MediaRule = rule2.type === 'atrule' && rule2.name === 'media';
  const rule3 = isRule2MediaRule && rule2.nodes && rule2.nodes[0];
  return rule1 && rule3 && rule1.selector && rule3.selector && rule1.selector === rule3.selector && (!except.length || except.some(entry => entry instanceof RegExp ? !entry.test(rule1.selector) : entry !== rule1.selector)) && (!only.length || only.some(entry => entry instanceof RegExp ? entry.test(rule1.selector) : entry === rule1.selector));
}

function areRulesPotentialNestingRule(rule1, rule2, opts) {
  const except = [].concat(Object(opts).except || []);
  const only = [].concat(Object(opts).only || []);
  const result = rule1.selectors && rule2.selectors && rule2.selectors.every(rule2Selector => rule1.selectors.every(rule1Selector => rule2Selector.length < rule1Selector.length && rule2Selector === rule1Selector.slice(0, rule2Selector.length) && !/^[A-Za-z0-9-_]/.test(rule1Selector.slice(rule2Selector.length)) && (!except.length || except.some(entry => entry instanceof RegExp ? !entry.test(rule1Selector.slice(rule2Selector.length)) : entry !== rule1Selector.slice(rule2Selector.length))) && (!only.length || only.some(entry => entry instanceof RegExp ? entry.test(rule1Selector.slice(rule2Selector.length)) : entry === rule1Selector.slice(rule2Selector.length)))));
  return result;
}

function fixNestingAtRule(rule1, rule2) {
  rule1.remove();
  rule1.selectors = rule1.selectors.map(selector => `${selector.slice(0, -rule2.selector.length - 1)} &`);
  const atrule = Object.assign(postcss.atRule({
    name: 'nest',
    params: String(rule1.selector)
  }), {
    raws: Object.assign(rule1.raws, {
      afterName: ' '
    }),
    source: rule1.source
  });
  atrule.append(...rule1.nodes);
  rule2.append(atrule);
}

function fixNestingMediaRule(rule1, media) {
  const isMediaMediaRule = media.type === 'atrule' && media.name === 'media';

  if (isMediaMediaRule) {
    const rule2 = media.nodes[0];
    const mediaRule = media.clone().removeAll();
    mediaRule.append(rule2.nodes.map(node => node.clone()));
    rule1.append(mediaRule);
    rule2.remove();

    if (!media.nodes.length) {
      media.remove();
    }
  }
}

function fixNestingRule(rule1, rule2) {
  rule1.selectors = rule1.selectors.map(selector => `&${selector.slice(rule2.selector.length)}`);
  rule2.append(rule1);
}

const ruleName = 'csstools/use-nesting';
var index = stylelint.createPlugin(ruleName, (action, opts, context) => {
  const shouldFix = is(context, 'fix', true);
  return async (root, result) => {
    // validate the action
    const isActionValid = stylelint.utils.validateOptions(result, ruleName, {
      actual: action,

      possible() {
        return is(action, ['always', 'ignore', true, false, null]);
      }

    });

    if (isActionValid) {
      if (is(action, ['always', true])) {
        result.root.walk(rule => {
          let isProcessing = true;

          while (isProcessing) {
            isProcessing = false;
            const prev = rule.prev();
            const isRuleValid = rule && (rule.type === 'rule' || rule.type === 'atrule');
            const isPrevValid = prev && (prev.type === 'rule' || prev.type === 'atrule'); // if the previous node is also a rule

            if (isRuleValid && isPrevValid) {
              if (areRulesPotentialNestingRule(rule, prev, opts)) {
                // fix or report the current rule if it could be nested inside the previous rule
                if (shouldFix) {
                  fixNestingRule(rule, prev);
                  isProcessing = true;
                } else {
                  report(rule, prev, result);
                }
              } else if (areRulesPotentialNestingRule(prev, rule, opts)) {
                // fix or report the previous rule if it could be nested inside the current rule
                if (shouldFix) {
                  fixNestingRule(prev, rule);
                  isProcessing = true;
                } else {
                  report(prev, rule, result);
                }
              } else if (areRulesPotentialNestingAtRule(rule, prev, opts)) {
                // fix or report the current rule if it could be nested inside the previous rule
                if (shouldFix) {
                  fixNestingAtRule(rule, prev);
                  isProcessing = true;
                } else {
                  report(rule, prev, result);
                }
              } else if (areRulesPotentialNestingAtRule(prev, rule, opts)) {
                // fix or report the previous rule if it could be nested inside the current rule
                if (shouldFix) {
                  fixNestingAtRule(prev, rule);
                  isProcessing = true;
                } else {
                  report(prev, rule, result);
                }
              } else if (areRulesPotentialNestingMediaRule(rule, prev, opts)) {
                // fix or report the current rule if it could be nested inside the previous rule
                if (shouldFix) {
                  fixNestingMediaRule(rule, prev);
                  isProcessing = true;
                } else {
                  report(rule, prev, result);
                }
              } else if (areRulesPotentialNestingMediaRule(prev, rule, opts)) {
                // fix or report the current rule if it could be nested inside the previous rule
                if (shouldFix) {
                  fixNestingMediaRule(prev, rule);
                  isProcessing = true;
                } else {
                  report(prev, rule, result);
                }
              }
            }
          }
        });
      }
    }
  };
});
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (node, prev) => {
    const outside = prev.type === 'atrule' ? `@${prev.name} ${prev.params}` : node.selector;
    const inside = prev.type === 'atrule' ? node.selector : prev.selector;
    const message = `Expected "${outside}" inside "${inside}".`;
    return message;
  }
});

const report = (rule1, rule2, result) => {
  stylelint.utils.report({
    message: messages.expected(rule1, rule2),
    node: rule1,
    result,
    ruleName
  });
};

exports.default = index;
exports.messages = messages;
exports.ruleName = ruleName;
//# sourceMappingURL=index.js.map
