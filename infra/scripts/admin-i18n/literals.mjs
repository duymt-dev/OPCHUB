import ts from 'typescript';
import { children, finding, unique } from './source-files.mjs';

const VI = /[àáâãèéêìíòóôõùúýăđĩũơư\u1ea0-\u1ef9]/iu;
const ATTRS =
  /^(?:aria-label|aria-description|title|placeholder|alt|label|subtitle|description|content|message|tooltip|okText|cancelText|closeLabel|retryLabel|emptyText|loadingText|text|caption|hint|data-screen-label)$/;
const LABELS =
  /^(?:label|title|subtitle|description|content|message|placeholder|tooltip|okText|cancelText|closeLabel|retryLabel|emptyText|loadingText|text|caption|hint|unit|suffix|prefix)$/;
const UI_CALLS = new Set(['toast', 'messageOf', 'message', 'notification', 'alert', 'confirm']);

export function translatorNames(source) {
  const factories = new Set();
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    if (!['next-intl', 'next-intl/server'].includes(node.moduleSpecifier.text)) continue;
    const binding = node.importClause?.namedBindings;
    if (binding && ts.isNamedImports(binding))
      for (const item of binding.elements) {
        if (
          ['useTranslations', 'getTranslations', 'createTranslator'].includes(
            item.propertyName?.text ?? item.name.text,
          )
        )
          factories.add(item.name.text);
      }
  }
  const names = new Set();
  children(source, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    const call = ts.isAwaitExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    if (
      ts.isCallExpression(call) &&
      ts.isIdentifier(call.expression) &&
      factories.has(call.expression.text)
    )
      names.add(node.name.text);
  });
  return names;
}

export function translationCall(node, names) {
  return (
    ts.isCallExpression(node) &&
    ((ts.isIdentifier(node.expression) && names.has(node.expression.text)) ||
      (ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        names.has(node.expression.expression.text)))
  );
}

export function renderExpressions(source) {
  const found = [];
  children(source, (node) => {
    if (!ts.isJsxExpression(node) || !node.expression) return;
    const parent = node.parent;
    if (ts.isJsxAttribute(parent)) {
      if (ATTRS.test(parent.name.getText(source))) found.push(node.expression);
    } else if (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) found.push(node.expression);
  });
  return found;
}

/** Only displayed branches, never a ternary's enum comparison, are visited here. */
export function renderedParts(node, visit) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node))
    return renderedParts(node.expression, visit);
  if (ts.isConditionalExpression(node)) {
    renderedParts(node.whenTrue, visit);
    renderedParts(node.whenFalse, visit);
    return;
  }
  if (
    ts.isBinaryExpression(node) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(node.operatorToken.kind)
  ) {
    if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken)
      renderedParts(node.left, visit);
    renderedParts(node.right, visit);
    return;
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const item of node.elements) renderedParts(item, visit);
    return;
  }
  if (ts.isTaggedTemplateExpression(node)) return renderedParts(node.template, visit);
  if (ts.isTemplateExpression(node)) {
    visit(node.head);
    for (const span of node.templateSpans) {
      visit(span.expression);
      visit(span.literal);
    }
    return;
  }
  visit(node);
}

function machine(value) {
  return (
    /^(?:https?:\/\/|\/?(?:[\w@.-]+\/)+[\w/*?=&#.-]*$|#[\da-f]{3,8}$)/i.test(value) ||
    /^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(value) ||
    (/^[Mm][\d\s.,+\-EeMmLlHhVvCcSsQqTtAaZz]+$/.test(value) && /\d/.test(value))
  );
}

function excluded(node, source, translators) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isImportDeclaration(parent) ||
      ts.isExportDeclaration(parent) ||
      ts.isImportTypeNode(parent)
    )
      return true;
    if (
      translationCall(parent, translators) &&
      parent.arguments[0] &&
      node.pos >= parent.arguments[0].pos &&
      node.end <= parent.arguments[0].end
    )
      return true;
    if (
      ts.isNewExpression(parent) &&
      ts.isPropertyAccessExpression(parent.expression) &&
      ts.isIdentifier(parent.expression.expression) &&
      parent.expression.expression.text === 'Intl'
    )
      return true;
    if (!VI.test(node.text)) {
      if (ts.isJsxAttribute(parent) && !ATTRS.test(parent.name.getText(source))) return true;
      if (
        ts.isConditionalExpression(parent) &&
        node.pos >= parent.condition.pos &&
        node.end <= parent.condition.end
      )
        return true;
      if (
        ts.isBinaryExpression(parent) &&
        [
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
        ].includes(parent.operatorToken.kind)
      )
        return true;
    }
    if (ts.isJsxExpression(parent) || ts.isStatement(parent)) break;
  }
  return (
    (ts.isExpressionStatement(node.parent) &&
      ['use client', 'use server', 'use strict'].includes(node.text)) ||
    (ts.isPropertyAssignment(node.parent) && node.parent.name === node && !VI.test(node.text))
  );
}

export function literalFindings(source, checker) {
  const names = translatorNames(source),
    result = [],
    visible = new Set();
  for (const expression of renderExpressions(source))
    renderedParts(expression, (node) => {
      visible.add(node);
      if (ts.isIdentifier(node) && checker) {
        const symbol = checker.getSymbolAtLocation(node);
        for (const declaration of symbol?.declarations ?? []) {
          if (ts.isVariableDeclaration(declaration) && declaration.initializer)
            renderedParts(declaration.initializer, (child) => visible.add(child));
        }
      }
    });
  children(source, (node) => {
    const textNode = ts.isJsxText(node);
    if (
      !textNode &&
      !ts.isStringLiteralLike(node) &&
      !ts.isTemplateHead(node) &&
      !ts.isTemplateMiddle(node) &&
      !ts.isTemplateTail(node)
    )
      return;
    const text = node.text.trim();
    if (!text || !/[\p{L}\p{N}]/u.test(text) || excluded(node, source, names)) return;
    const parent = node.parent;
    const attribute = ts.isJsxAttribute(parent) ? parent.name.getText(source) : '';
    const property = ts.isPropertyAssignment(parent)
      ? parent.name.getText(source).replaceAll(/['"]/g, '')
      : '';
    let uiCall = false;
    for (let p = parent; p && !ts.isStatement(p); p = p.parent) {
      if (ts.isCallExpression(p)) {
        const callee = p.expression.getText(source).split('.')[0];
        if (UI_CALLS.has(callee)) uiCall = true;
        if (
          translationCall(p, names) &&
          p.arguments[1] &&
          node.pos >= p.arguments[1].pos &&
          node.end <= p.arguments[1].end
        )
          uiCall = true;
      }
    }
    const explicit =
      textNode || visible.has(node) || ATTRS.test(attribute) || LABELS.test(property) || uiCall;
    const human =
      VI.test(text) ||
      (!machine(text) && (/\s/.test(text) || /^[A-Z][a-z]+(?:[ .!?…-]|$)/.test(text)));
    if (explicit || human)
      result.push(finding(source, node, explicit ? 'ui-literal' : 'human-literal', text));
  });
  return unique(result);
}
