import ts from 'typescript';
import { children, finding, unique } from './source-files.mjs';
import { renderedParts, renderExpressions, translationCall, translatorNames } from './literals.mjs';

function variants(type) {
  return type.isUnion() ? type.types : [type];
}
function numberLike(type) {
  const parts = variants(type);
  const primitive =
    ts.TypeFlags.NumberLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Never;
  return (
    parts.some((part) => part.flags & ts.TypeFlags.NumberLike) &&
    parts.every((part) => part.flags & primitive)
  );
}
function stringEnum(type) {
  const parts = variants(type).filter(
    (part) => !(part.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Never)),
  );
  return parts.length > 0 && parts.every((part) => part.flags & ts.TypeFlags.StringLiteral);
}

export function numericFindings(source, checker) {
  const result = [],
    translators = translatorNames(source);
  const inspect = (node, kind = 'numeric-jsx', extra = {}) => {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node) ||
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      return;
    if (ts.isCallExpression(node)) {
      if (translationCall(node, translators)) return;
      const call = node.expression;
      if (ts.isIdentifier(call) && call.text === 'String' && node.arguments[0]) {
        inspect(node.arguments[0], 'numeric-coercion', extra);
        return;
      }
      if (
        ts.isPropertyAccessExpression(call) &&
        ['toString', 'toFixed', 'toPrecision'].includes(call.name.text)
      ) {
        const type = checker.getTypeAtLocation(call.expression);
        if (numberLike(type))
          result.push(finding(source, node, 'numeric-coercion', undefined, extra));
        return;
      }
    }
    const type = checker.getTypeAtLocation(node);
    if (numberLike(type)) result.push(finding(source, node, kind, undefined, extra));
    else if (kind === 'numeric-jsx' && stringEnum(type))
      result.push(
        finding(source, node, 'enum-jsx', undefined, {
          values: variants(type)
            .map((part) => part.value)
            .filter((value) => typeof value === 'string'),
        }),
      );
  };
  const display = (node) => {
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return display(node.expression);
    if (ts.isConditionalExpression(node)) {
      display(node.whenTrue);
      display(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        display(node.right);
        return;
      }
      // Preserve the existing null/zero fallback BEFORE formatting it into a string.
      if (
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(
          node.operatorToken.kind,
        )
      ) {
        inspect(node);
        return;
      }
    }
    if (ts.isTemplateExpression(node)) {
      for (const span of node.templateSpans) display(span.expression);
      return;
    }
    if (ts.isTaggedTemplateExpression(node)) {
      display(node.template);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) display(element);
      return;
    }
    inspect(node);
  };
  for (const expression of renderExpressions(source)) display(expression);
  children(source, (node) => {
    if (!translationCall(node, translators) || !node.arguments[1]) return;
    const values = node.arguments[1];
    if (ts.isObjectLiteralExpression(values)) {
      for (const property of values.properties) {
        if (ts.isPropertyAssignment(property))
          inspect(property.initializer, 'numeric-translation', {
            binding: property.name.getText(source),
          });
        else if (ts.isShorthandPropertyAssignment(property))
          inspect(property.name, 'numeric-translation', { binding: property.name.text });
      }
    } else {
      const type = checker.getTypeAtLocation(values);
      for (const property of checker.getPropertiesOfType(type)) {
        if (numberLike(checker.getTypeOfSymbolAtLocation(property, values)))
          result.push(
            finding(
              source,
              values,
              'numeric-translation',
              `${values.getText(source)}.${property.name}`,
              { binding: property.name },
            ),
          );
      }
    }
  });
  return unique(result);
}
