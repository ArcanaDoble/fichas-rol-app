/******/ var __webpack_modules__ = ({

/***/ 47:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * @license React
 * react-dom-server-legacy.browser.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*


 JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)

 Copyright (c) 2011 Gary Court
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/

var React = __webpack_require__(540),
  ReactDOM = __webpack_require__(961);
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_SCOPE_TYPE = Symbol.for("react.scope"),
  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"),
  REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var isArrayImpl = Array.isArray;
function murmurhash3_32_gc(key, seed) {
  var remainder = key.length & 3;
  var bytes = key.length - remainder;
  var h1 = seed;
  for (seed = 0; seed < bytes; ) {
    var k1 =
      (key.charCodeAt(seed) & 255) |
      ((key.charCodeAt(++seed) & 255) << 8) |
      ((key.charCodeAt(++seed) & 255) << 16) |
      ((key.charCodeAt(++seed) & 255) << 24);
    ++seed;
    k1 =
      (3432918353 * (k1 & 65535) +
        (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      (461845907 * (k1 & 65535) + (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (5 * (h1 & 65535) + (((5 * (h1 >>> 16)) & 65535) << 16)) & 4294967295;
    h1 = (h1 & 65535) + 27492 + ((((h1 >>> 16) + 58964) & 65535) << 16);
  }
  k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
    case 2:
      k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
    case 1:
      (k1 ^= key.charCodeAt(seed) & 255),
        (k1 =
          (3432918353 * (k1 & 65535) +
            (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295),
        (k1 = (k1 << 15) | (k1 >>> 17)),
        (h1 ^=
          (461845907 * (k1 & 65535) +
            (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295);
  }
  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 =
    (2246822507 * (h1 & 65535) + (((2246822507 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  h1 ^= h1 >>> 13;
  h1 =
    (3266489909 * (h1 & 65535) + (((3266489909 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  return (h1 ^ (h1 >>> 16)) >>> 0;
}
var assign = Object.assign,
  hasOwnProperty = Object.prototype.hasOwnProperty,
  VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ),
  illegalAttributeNameCache = {},
  validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
    return !0;
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
    return (validatedAttributeNameCache[attributeName] = !0);
  illegalAttributeNameCache[attributeName] = !0;
  return !1;
}
var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  ),
  aliases = new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]),
  matchHtmlRegExp = /["'&<>]/;
function escapeTextForBrowser(text) {
  if (
    "boolean" === typeof text ||
    "number" === typeof text ||
    "bigint" === typeof text
  )
    return "" + text;
  text = "" + text;
  var match = matchHtmlRegExp.exec(text);
  if (match) {
    var html = "",
      index,
      lastIndex = 0;
    for (index = match.index; index < text.length; index++) {
      switch (text.charCodeAt(index)) {
        case 34:
          match = "&quot;";
          break;
        case 38:
          match = "&amp;";
          break;
        case 39:
          match = "&#x27;";
          break;
        case 60:
          match = "&lt;";
          break;
        case 62:
          match = "&gt;";
          break;
        default:
          continue;
      }
      lastIndex !== index && (html += text.slice(lastIndex, index));
      lastIndex = index + 1;
      html += match;
    }
    text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
  }
  return text;
}
var uppercasePattern = /([A-Z])/g,
  msPattern = /^ms-/,
  isJavaScriptProtocol =
    /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
function sanitizeURL(url) {
  return isJavaScriptProtocol.test("" + url)
    ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
    : url;
}
var ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  ReactDOMSharedInternals =
    ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  sharedNotPendingObject = {
    pending: !1,
    data: null,
    method: null,
    action: null
  },
  previousDispatcher = ReactDOMSharedInternals.d;
ReactDOMSharedInternals.d = {
  f: previousDispatcher.f,
  r: previousDispatcher.r,
  D: prefetchDNS,
  C: preconnect,
  L: preload,
  m: preloadModule,
  X: preinitScript,
  S: preinitStyle,
  M: preinitModuleScript
};
var PRELOAD_NO_CREDS = [],
  currentlyFlushingRenderState = null,
  scriptRegex = /(<\/|<)(s)(cript)/gi;
function scriptReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
}
function createResumableState(
  identifierPrefix,
  externalRuntimeConfig,
  bootstrapScriptContent,
  bootstrapScripts,
  bootstrapModules
) {
  return {
    idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
    nextFormID: 0,
    streamingFormat: 0,
    bootstrapScriptContent: bootstrapScriptContent,
    bootstrapScripts: bootstrapScripts,
    bootstrapModules: bootstrapModules,
    instructions: 0,
    hasBody: !1,
    hasHtml: !1,
    unknownResources: {},
    dnsResources: {},
    connectResources: { default: {}, anonymous: {}, credentials: {} },
    imageResources: {},
    styleResources: {},
    scriptResources: {},
    moduleUnknownResources: {},
    moduleScriptResources: {}
  };
}
function createFormatContext(
  insertionMode,
  selectedValue,
  tagScope,
  viewTransition
) {
  return {
    insertionMode: insertionMode,
    selectedValue: selectedValue,
    tagScope: tagScope,
    viewTransition: viewTransition
  };
}
function getChildFormatContext(parentContext, type, props) {
  var subtreeScope = parentContext.tagScope & -25;
  switch (type) {
    case "noscript":
      return createFormatContext(2, null, subtreeScope | 1, null);
    case "select":
      return createFormatContext(
        2,
        null != props.value ? props.value : props.defaultValue,
        subtreeScope,
        null
      );
    case "svg":
      return createFormatContext(4, null, subtreeScope, null);
    case "picture":
      return createFormatContext(2, null, subtreeScope | 2, null);
    case "math":
      return createFormatContext(5, null, subtreeScope, null);
    case "foreignObject":
      return createFormatContext(2, null, subtreeScope, null);
    case "table":
      return createFormatContext(6, null, subtreeScope, null);
    case "thead":
    case "tbody":
    case "tfoot":
      return createFormatContext(7, null, subtreeScope, null);
    case "colgroup":
      return createFormatContext(9, null, subtreeScope, null);
    case "tr":
      return createFormatContext(8, null, subtreeScope, null);
    case "head":
      if (2 > parentContext.insertionMode)
        return createFormatContext(3, null, subtreeScope, null);
      break;
    case "html":
      if (0 === parentContext.insertionMode)
        return createFormatContext(1, null, subtreeScope, null);
  }
  return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode
    ? createFormatContext(2, null, subtreeScope, null)
    : parentContext.tagScope !== subtreeScope
      ? createFormatContext(
          parentContext.insertionMode,
          parentContext.selectedValue,
          subtreeScope,
          null
        )
      : parentContext;
}
function getSuspenseViewTransition(parentViewTransition) {
  return null === parentViewTransition
    ? null
    : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
}
function getSuspenseFallbackFormatContext(resumableState, parentContext) {
  parentContext.tagScope & 32 && (resumableState.instructions |= 128);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    parentContext.tagScope | 12,
    getSuspenseViewTransition(parentContext.viewTransition)
  );
}
function getSuspenseContentFormatContext(resumableState, parentContext) {
  resumableState = getSuspenseViewTransition(parentContext.viewTransition);
  var subtreeScope = parentContext.tagScope | 16;
  null !== resumableState &&
    "none" !== resumableState.share &&
    (subtreeScope |= 64);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    subtreeScope,
    resumableState
  );
}
var styleNameCache = new Map();
function pushStyleAttribute(target, style) {
  if ("object" !== typeof style) throw Error(formatProdErrorMessage(62));
  var isFirst = !0,
    styleName;
  for (styleName in style)
    if (hasOwnProperty.call(style, styleName)) {
      var styleValue = style[styleName];
      if (
        null != styleValue &&
        "boolean" !== typeof styleValue &&
        "" !== styleValue
      ) {
        if (0 === styleName.indexOf("--")) {
          var nameChunk = escapeTextForBrowser(styleName);
          styleValue = escapeTextForBrowser(("" + styleValue).trim());
        } else
          (nameChunk = styleNameCache.get(styleName)),
            void 0 === nameChunk &&
              ((nameChunk = escapeTextForBrowser(
                styleName
                  .replace(uppercasePattern, "-$1")
                  .toLowerCase()
                  .replace(msPattern, "-ms-")
              )),
              styleNameCache.set(styleName, nameChunk)),
            (styleValue =
              "number" === typeof styleValue
                ? 0 === styleValue || unitlessNumbers.has(styleName)
                  ? "" + styleValue
                  : styleValue + "px"
                : escapeTextForBrowser(("" + styleValue).trim()));
        isFirst
          ? ((isFirst = !1),
            target.push(' style="', nameChunk, ":", styleValue))
          : target.push(";", nameChunk, ":", styleValue);
      }
    }
  isFirst || target.push('"');
}
function pushBooleanAttribute(target, name, value) {
  value &&
    "function" !== typeof value &&
    "symbol" !== typeof value &&
    target.push(" ", name, '=""');
}
function pushStringAttribute(target, name, value) {
  "function" !== typeof value &&
    "symbol" !== typeof value &&
    "boolean" !== typeof value &&
    target.push(" ", name, '="', escapeTextForBrowser(value), '"');
}
var actionJavaScriptURL = escapeTextForBrowser(
  "javascript:throw new Error('React form unexpectedly submitted.')"
);
function pushAdditionalFormField(value, key) {
  this.push('<input type="hidden"');
  validateAdditionalFormField(value);
  pushStringAttribute(this, "name", key);
  pushStringAttribute(this, "value", value);
  this.push("/>");
}
function validateAdditionalFormField(value) {
  if ("string" !== typeof value) throw Error(formatProdErrorMessage(480));
}
function getCustomFormFields(resumableState, formAction) {
  if ("function" === typeof formAction.$$FORM_ACTION) {
    var id = resumableState.nextFormID++;
    resumableState = resumableState.idPrefix + id;
    try {
      var customFields = formAction.$$FORM_ACTION(resumableState);
      if (customFields) {
        var formData = customFields.data;
        null != formData && formData.forEach(validateAdditionalFormField);
      }
      return customFields;
    } catch (x) {
      if ("object" === typeof x && null !== x && "function" === typeof x.then)
        throw x;
    }
  }
  return null;
}
function pushFormActionAttribute(
  target,
  resumableState,
  renderState,
  formAction,
  formEncType,
  formMethod,
  formTarget,
  name
) {
  var formData = null;
  if ("function" === typeof formAction) {
    var customFields = getCustomFormFields(resumableState, formAction);
    null !== customFields
      ? ((name = customFields.name),
        (formAction = customFields.action || ""),
        (formEncType = customFields.encType),
        (formMethod = customFields.method),
        (formTarget = customFields.target),
        (formData = customFields.data))
      : (target.push(" ", "formAction", '="', actionJavaScriptURL, '"'),
        (formTarget = formMethod = formEncType = formAction = name = null),
        injectFormReplayingRuntime(resumableState, renderState));
  }
  null != name && pushAttribute(target, "name", name);
  null != formAction && pushAttribute(target, "formAction", formAction);
  null != formEncType && pushAttribute(target, "formEncType", formEncType);
  null != formMethod && pushAttribute(target, "formMethod", formMethod);
  null != formTarget && pushAttribute(target, "formTarget", formTarget);
  return formData;
}
function pushAttribute(target, name, value) {
  switch (name) {
    case "className":
      pushStringAttribute(target, "class", value);
      break;
    case "tabIndex":
      pushStringAttribute(target, "tabindex", value);
      break;
    case "dir":
    case "role":
    case "viewBox":
    case "width":
    case "height":
      pushStringAttribute(target, name, value);
      break;
    case "style":
      pushStyleAttribute(target, value);
      break;
    case "src":
    case "href":
      if ("" === value) break;
    case "action":
    case "formAction":
      if (
        null == value ||
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "defaultValue":
    case "defaultChecked":
    case "innerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "ref":
      break;
    case "autoFocus":
    case "multiple":
    case "muted":
      pushBooleanAttribute(target, name.toLowerCase(), value);
      break;
    case "xlinkHref":
      if (
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(" ", "xlink:href", '="', escapeTextForBrowser(value), '"');
      break;
    case "contentEditable":
    case "spellCheck":
    case "draggable":
    case "value":
    case "autoReverse":
    case "externalResourcesRequired":
    case "focusable":
    case "preserveAlpha":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "inert":
    case "allowFullScreen":
    case "async":
    case "autoPlay":
    case "controls":
    case "default":
    case "defer":
    case "disabled":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "hidden":
    case "loop":
    case "noModule":
    case "noValidate":
    case "open":
    case "playsInline":
    case "readOnly":
    case "required":
    case "reversed":
    case "scoped":
    case "seamless":
    case "itemScope":
      value &&
        "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(" ", name, '=""');
      break;
    case "capture":
    case "download":
      !0 === value
        ? target.push(" ", name, '=""')
        : !1 !== value &&
          "function" !== typeof value &&
          "symbol" !== typeof value &&
          target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "cols":
    case "rows":
    case "size":
    case "span":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        !isNaN(value) &&
        1 <= value &&
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "rowSpan":
    case "start":
      "function" === typeof value ||
        "symbol" === typeof value ||
        isNaN(value) ||
        target.push(" ", name, '="', escapeTextForBrowser(value), '"');
      break;
    case "xlinkActuate":
      pushStringAttribute(target, "xlink:actuate", value);
      break;
    case "xlinkArcrole":
      pushStringAttribute(target, "xlink:arcrole", value);
      break;
    case "xlinkRole":
      pushStringAttribute(target, "xlink:role", value);
      break;
    case "xlinkShow":
      pushStringAttribute(target, "xlink:show", value);
      break;
    case "xlinkTitle":
      pushStringAttribute(target, "xlink:title", value);
      break;
    case "xlinkType":
      pushStringAttribute(target, "xlink:type", value);
      break;
    case "xmlBase":
      pushStringAttribute(target, "xml:base", value);
      break;
    case "xmlLang":
      pushStringAttribute(target, "xml:lang", value);
      break;
    case "xmlSpace":
      pushStringAttribute(target, "xml:space", value);
      break;
    default:
      if (
        !(2 < name.length) ||
        ("o" !== name[0] && "O" !== name[0]) ||
        ("n" !== name[1] && "N" !== name[1])
      )
        if (((name = aliases.get(name) || name), isAttributeNameSafe(name))) {
          switch (typeof value) {
            case "function":
            case "symbol":
              return;
            case "boolean":
              var prefix$8 = name.toLowerCase().slice(0, 5);
              if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
          }
          target.push(" ", name, '="', escapeTextForBrowser(value), '"');
        }
  }
}
function pushInnerHTML(target, innerHTML, children) {
  if (null != innerHTML) {
    if (null != children) throw Error(formatProdErrorMessage(60));
    if ("object" !== typeof innerHTML || !("__html" in innerHTML))
      throw Error(formatProdErrorMessage(61));
    innerHTML = innerHTML.__html;
    null !== innerHTML && void 0 !== innerHTML && target.push("" + innerHTML);
  }
}
function flattenOptionChildren(children) {
  var content = "";
  React.Children.forEach(children, function (child) {
    null != child && (content += child);
  });
  return content;
}
function injectFormReplayingRuntime(resumableState, renderState) {
  if (0 === (resumableState.instructions & 16)) {
    resumableState.instructions |= 16;
    var preamble = renderState.preamble,
      bootstrapChunks = renderState.bootstrapChunks;
    (preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length
      ? (bootstrapChunks.push(renderState.startInlineScript),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(
          ">",
          'addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});',
          "\x3c/script>"
        ))
      : bootstrapChunks.unshift(
          renderState.startInlineScript,
          ">",
          'addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});',
          "\x3c/script>"
        );
  }
}
function pushLinkImpl(target, props) {
  target.push(startChunkForTag("link"));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, "link"));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push("/>");
  return null;
}
var styleRegex = /(<\/|<)(s)(tyle)/gi;
function styleReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
}
function pushSelfClosing(target, props, tag) {
  target.push(startChunkForTag(tag));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, tag));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push("/>");
  return null;
}
function pushTitleImpl(target, props) {
  target.push(startChunkForTag("title"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  props = Array.isArray(children)
    ? 2 > children.length
      ? children[0]
      : null
    : children;
  "function" !== typeof props &&
    "symbol" !== typeof props &&
    null !== props &&
    void 0 !== props &&
    target.push(escapeTextForBrowser("" + props));
  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag("title"));
  return null;
}
function pushScriptImpl(target, props) {
  target.push(startChunkForTag("script"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  pushInnerHTML(target, innerHTML, children);
  "string" === typeof children &&
    target.push(("" + children).replace(scriptRegex, scriptReplacer));
  target.push(endChunkForTag("script"));
  return null;
}
function pushStartSingletonElement(target, props, tag) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  pushInnerHTML(target, innerHTML, tag);
  return tag;
}
function pushStartGenericElement(target, props, tag) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(">");
  pushInnerHTML(target, innerHTML, tag);
  return "string" === typeof tag
    ? (target.push(escapeTextForBrowser(tag)), null)
    : tag;
}
var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,
  validatedTagCache = new Map();
function startChunkForTag(tag) {
  var tagStartChunk = validatedTagCache.get(tag);
  if (void 0 === tagStartChunk) {
    if (!VALID_TAG_REGEX.test(tag))
      throw Error(formatProdErrorMessage(65, tag));
    tagStartChunk = "<" + tag;
    validatedTagCache.set(tag, tagStartChunk);
  }
  return tagStartChunk;
}
function pushStartInstance(
  target$jscomp$0,
  type,
  props,
  resumableState,
  renderState,
  preambleState,
  hoistableState,
  formatContext,
  textEmbedded
) {
  switch (type) {
    case "div":
    case "span":
    case "svg":
    case "path":
      break;
    case "a":
      target$jscomp$0.push(startChunkForTag("a"));
      var children = null,
        innerHTML = null,
        propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              case "href":
                "" === propValue
                  ? pushStringAttribute(target$jscomp$0, "href", "")
                  : pushAttribute(target$jscomp$0, propKey, propValue);
                break;
              default:
                pushAttribute(target$jscomp$0, propKey, propValue);
            }
        }
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML, children);
      if ("string" === typeof children) {
        target$jscomp$0.push(escapeTextForBrowser(children));
        var JSCompiler_inline_result = null;
      } else JSCompiler_inline_result = children;
      return JSCompiler_inline_result;
    case "g":
    case "p":
    case "li":
      break;
    case "select":
      target$jscomp$0.push(startChunkForTag("select"));
      var children$jscomp$0 = null,
        innerHTML$jscomp$0 = null,
        propKey$jscomp$0;
      for (propKey$jscomp$0 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$0)) {
          var propValue$jscomp$0 = props[propKey$jscomp$0];
          if (null != propValue$jscomp$0)
            switch (propKey$jscomp$0) {
              case "children":
                children$jscomp$0 = propValue$jscomp$0;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$0 = propValue$jscomp$0;
                break;
              case "defaultValue":
              case "value":
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$0,
                  propValue$jscomp$0
                );
            }
        }
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
      return children$jscomp$0;
    case "option":
      var selectedValue = formatContext.selectedValue;
      target$jscomp$0.push(startChunkForTag("option"));
      var children$jscomp$1 = null,
        value = null,
        selected = null,
        innerHTML$jscomp$1 = null,
        propKey$jscomp$1;
      for (propKey$jscomp$1 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$1)) {
          var propValue$jscomp$1 = props[propKey$jscomp$1];
          if (null != propValue$jscomp$1)
            switch (propKey$jscomp$1) {
              case "children":
                children$jscomp$1 = propValue$jscomp$1;
                break;
              case "selected":
                selected = propValue$jscomp$1;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$1 = propValue$jscomp$1;
                break;
              case "value":
                value = propValue$jscomp$1;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$1,
                  propValue$jscomp$1
                );
            }
        }
      if (null != selectedValue) {
        var stringValue =
          null !== value
            ? "" + value
            : flattenOptionChildren(children$jscomp$1);
        if (isArrayImpl(selectedValue))
          for (var i = 0; i < selectedValue.length; i++) {
            if ("" + selectedValue[i] === stringValue) {
              target$jscomp$0.push(' selected=""');
              break;
            }
          }
        else
          "" + selectedValue === stringValue &&
            target$jscomp$0.push(' selected=""');
      } else selected && target$jscomp$0.push(' selected=""');
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
      return children$jscomp$1;
    case "textarea":
      target$jscomp$0.push(startChunkForTag("textarea"));
      var value$jscomp$0 = null,
        defaultValue = null,
        children$jscomp$2 = null,
        propKey$jscomp$2;
      for (propKey$jscomp$2 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$2)) {
          var propValue$jscomp$2 = props[propKey$jscomp$2];
          if (null != propValue$jscomp$2)
            switch (propKey$jscomp$2) {
              case "children":
                children$jscomp$2 = propValue$jscomp$2;
                break;
              case "value":
                value$jscomp$0 = propValue$jscomp$2;
                break;
              case "defaultValue":
                defaultValue = propValue$jscomp$2;
                break;
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(91));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$2,
                  propValue$jscomp$2
                );
            }
        }
      null === value$jscomp$0 &&
        null !== defaultValue &&
        (value$jscomp$0 = defaultValue);
      target$jscomp$0.push(">");
      if (null != children$jscomp$2) {
        if (null != value$jscomp$0) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children$jscomp$2)) {
          if (1 < children$jscomp$2.length)
            throw Error(formatProdErrorMessage(93));
          value$jscomp$0 = "" + children$jscomp$2[0];
        }
        value$jscomp$0 = "" + children$jscomp$2;
      }
      "string" === typeof value$jscomp$0 &&
        "\n" === value$jscomp$0[0] &&
        target$jscomp$0.push("\n");
      null !== value$jscomp$0 &&
        target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0));
      return null;
    case "input":
      target$jscomp$0.push(startChunkForTag("input"));
      var name = null,
        formAction = null,
        formEncType = null,
        formMethod = null,
        formTarget = null,
        value$jscomp$1 = null,
        defaultValue$jscomp$0 = null,
        checked = null,
        defaultChecked = null,
        propKey$jscomp$3;
      for (propKey$jscomp$3 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$3)) {
          var propValue$jscomp$3 = props[propKey$jscomp$3];
          if (null != propValue$jscomp$3)
            switch (propKey$jscomp$3) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "input"));
              case "name":
                name = propValue$jscomp$3;
                break;
              case "formAction":
                formAction = propValue$jscomp$3;
                break;
              case "formEncType":
                formEncType = propValue$jscomp$3;
                break;
              case "formMethod":
                formMethod = propValue$jscomp$3;
                break;
              case "formTarget":
                formTarget = propValue$jscomp$3;
                break;
              case "defaultChecked":
                defaultChecked = propValue$jscomp$3;
                break;
              case "defaultValue":
                defaultValue$jscomp$0 = propValue$jscomp$3;
                break;
              case "checked":
                checked = propValue$jscomp$3;
                break;
              case "value":
                value$jscomp$1 = propValue$jscomp$3;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$3,
                  propValue$jscomp$3
                );
            }
        }
      var formData = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction,
        formEncType,
        formMethod,
        formTarget,
        name
      );
      null !== checked
        ? pushBooleanAttribute(target$jscomp$0, "checked", checked)
        : null !== defaultChecked &&
          pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
      null !== value$jscomp$1
        ? pushAttribute(target$jscomp$0, "value", value$jscomp$1)
        : null !== defaultValue$jscomp$0 &&
          pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
      target$jscomp$0.push("/>");
      null != formData &&
        formData.forEach(pushAdditionalFormField, target$jscomp$0);
      return null;
    case "button":
      target$jscomp$0.push(startChunkForTag("button"));
      var children$jscomp$3 = null,
        innerHTML$jscomp$2 = null,
        name$jscomp$0 = null,
        formAction$jscomp$0 = null,
        formEncType$jscomp$0 = null,
        formMethod$jscomp$0 = null,
        formTarget$jscomp$0 = null,
        propKey$jscomp$4;
      for (propKey$jscomp$4 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$4)) {
          var propValue$jscomp$4 = props[propKey$jscomp$4];
          if (null != propValue$jscomp$4)
            switch (propKey$jscomp$4) {
              case "children":
                children$jscomp$3 = propValue$jscomp$4;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$2 = propValue$jscomp$4;
                break;
              case "name":
                name$jscomp$0 = propValue$jscomp$4;
                break;
              case "formAction":
                formAction$jscomp$0 = propValue$jscomp$4;
                break;
              case "formEncType":
                formEncType$jscomp$0 = propValue$jscomp$4;
                break;
              case "formMethod":
                formMethod$jscomp$0 = propValue$jscomp$4;
                break;
              case "formTarget":
                formTarget$jscomp$0 = propValue$jscomp$4;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$4,
                  propValue$jscomp$4
                );
            }
        }
      var formData$jscomp$0 = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction$jscomp$0,
        formEncType$jscomp$0,
        formMethod$jscomp$0,
        formTarget$jscomp$0,
        name$jscomp$0
      );
      target$jscomp$0.push(">");
      null != formData$jscomp$0 &&
        formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
      if ("string" === typeof children$jscomp$3) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
        var JSCompiler_inline_result$jscomp$0 = null;
      } else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
      return JSCompiler_inline_result$jscomp$0;
    case "form":
      target$jscomp$0.push(startChunkForTag("form"));
      var children$jscomp$4 = null,
        innerHTML$jscomp$3 = null,
        formAction$jscomp$1 = null,
        formEncType$jscomp$1 = null,
        formMethod$jscomp$1 = null,
        formTarget$jscomp$1 = null,
        propKey$jscomp$5;
      for (propKey$jscomp$5 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$5)) {
          var propValue$jscomp$5 = props[propKey$jscomp$5];
          if (null != propValue$jscomp$5)
            switch (propKey$jscomp$5) {
              case "children":
                children$jscomp$4 = propValue$jscomp$5;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$3 = propValue$jscomp$5;
                break;
              case "action":
                formAction$jscomp$1 = propValue$jscomp$5;
                break;
              case "encType":
                formEncType$jscomp$1 = propValue$jscomp$5;
                break;
              case "method":
                formMethod$jscomp$1 = propValue$jscomp$5;
                break;
              case "target":
                formTarget$jscomp$1 = propValue$jscomp$5;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$5,
                  propValue$jscomp$5
                );
            }
        }
      var formData$jscomp$1 = null,
        formActionName = null;
      if ("function" === typeof formAction$jscomp$1) {
        var customFields = getCustomFormFields(
          resumableState,
          formAction$jscomp$1
        );
        null !== customFields
          ? ((formAction$jscomp$1 = customFields.action || ""),
            (formEncType$jscomp$1 = customFields.encType),
            (formMethod$jscomp$1 = customFields.method),
            (formTarget$jscomp$1 = customFields.target),
            (formData$jscomp$1 = customFields.data),
            (formActionName = customFields.name))
          : (target$jscomp$0.push(
              " ",
              "action",
              '="',
              actionJavaScriptURL,
              '"'
            ),
            (formTarget$jscomp$1 =
              formMethod$jscomp$1 =
              formEncType$jscomp$1 =
              formAction$jscomp$1 =
                null),
            injectFormReplayingRuntime(resumableState, renderState));
      }
      null != formAction$jscomp$1 &&
        pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
      null != formEncType$jscomp$1 &&
        pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
      null != formMethod$jscomp$1 &&
        pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
      null != formTarget$jscomp$1 &&
        pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
      target$jscomp$0.push(">");
      null !== formActionName &&
        (target$jscomp$0.push('<input type="hidden"'),
        pushStringAttribute(target$jscomp$0, "name", formActionName),
        target$jscomp$0.push("/>"),
        null != formData$jscomp$1 &&
          formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
      if ("string" === typeof children$jscomp$4) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
        var JSCompiler_inline_result$jscomp$1 = null;
      } else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
      return JSCompiler_inline_result$jscomp$1;
    case "menuitem":
      target$jscomp$0.push(startChunkForTag("menuitem"));
      for (var propKey$jscomp$6 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$6)) {
          var propValue$jscomp$6 = props[propKey$jscomp$6];
          if (null != propValue$jscomp$6)
            switch (propKey$jscomp$6) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(400));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$6,
                  propValue$jscomp$6
                );
            }
        }
      target$jscomp$0.push(">");
      return null;
    case "object":
      target$jscomp$0.push(startChunkForTag("object"));
      var children$jscomp$5 = null,
        innerHTML$jscomp$4 = null,
        propKey$jscomp$7;
      for (propKey$jscomp$7 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$7)) {
          var propValue$jscomp$7 = props[propKey$jscomp$7];
          if (null != propValue$jscomp$7)
            switch (propKey$jscomp$7) {
              case "children":
                children$jscomp$5 = propValue$jscomp$7;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$4 = propValue$jscomp$7;
                break;
              case "data":
                var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                if ("" === sanitizedValue) break;
                target$jscomp$0.push(
                  " ",
                  "data",
                  '="',
                  escapeTextForBrowser(sanitizedValue),
                  '"'
                );
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$7,
                  propValue$jscomp$7
                );
            }
        }
      target$jscomp$0.push(">");
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
      if ("string" === typeof children$jscomp$5) {
        target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
        var JSCompiler_inline_result$jscomp$2 = null;
      } else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
      return JSCompiler_inline_result$jscomp$2;
    case "title":
      var noscriptTagInScope = formatContext.tagScope & 1,
        isFallback = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(
          target$jscomp$0,
          props
        );
      else
        isFallback
          ? (JSCompiler_inline_result$jscomp$3 = null)
          : (pushTitleImpl(renderState.hoistableChunks, props),
            (JSCompiler_inline_result$jscomp$3 = void 0));
      return JSCompiler_inline_result$jscomp$3;
    case "link":
      var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1,
        isFallback$jscomp$0 = formatContext.tagScope & 4,
        rel = props.rel,
        href = props.href,
        precedence = props.precedence;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$0 ||
        null != props.itemProp ||
        "string" !== typeof rel ||
        "string" !== typeof href ||
        "" === href
      ) {
        pushLinkImpl(target$jscomp$0, props);
        var JSCompiler_inline_result$jscomp$4 = null;
      } else if ("stylesheet" === props.rel)
        if (
          "string" !== typeof precedence ||
          null != props.disabled ||
          props.onLoad ||
          props.onError
        )
          JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
            target$jscomp$0,
            props
          );
        else {
          var styleQueue = renderState.styles.get(precedence),
            resourceState = resumableState.styleResources.hasOwnProperty(href)
              ? resumableState.styleResources[href]
              : void 0;
          if (null !== resourceState) {
            resumableState.styleResources[href] = null;
            styleQueue ||
              ((styleQueue = {
                precedence: escapeTextForBrowser(precedence),
                rules: [],
                hrefs: [],
                sheets: new Map()
              }),
              renderState.styles.set(precedence, styleQueue));
            var resource = {
              state: 0,
              props: assign({}, props, {
                "data-precedence": props.precedence,
                precedence: null
              })
            };
            if (resourceState) {
              2 === resourceState.length &&
                adoptPreloadCredentials(resource.props, resourceState);
              var preloadResource = renderState.preloads.stylesheets.get(href);
              preloadResource && 0 < preloadResource.length
                ? (preloadResource.length = 0)
                : (resource.state = 1);
            }
            styleQueue.sheets.set(href, resource);
            hoistableState && hoistableState.stylesheets.add(resource);
          } else if (styleQueue) {
            var resource$9 = styleQueue.sheets.get(href);
            resource$9 &&
              hoistableState &&
              hoistableState.stylesheets.add(resource$9);
          }
          textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
          JSCompiler_inline_result$jscomp$4 = null;
        }
      else
        props.onLoad || props.onError
          ? (JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
              target$jscomp$0,
              props
            ))
          : (textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
            (JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0
              ? null
              : pushLinkImpl(renderState.hoistableChunks, props)));
      return JSCompiler_inline_result$jscomp$4;
    case "script":
      var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1,
        asyncProp = props.async;
      if (
        "string" !== typeof props.src ||
        !props.src ||
        !asyncProp ||
        "function" === typeof asyncProp ||
        "symbol" === typeof asyncProp ||
        props.onLoad ||
        props.onError ||
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$1 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(
          target$jscomp$0,
          props
        );
      else {
        var key = props.src;
        if ("module" === props.type) {
          var resources = resumableState.moduleScriptResources;
          var preloads = renderState.preloads.moduleScripts;
        } else
          (resources = resumableState.scriptResources),
            (preloads = renderState.preloads.scripts);
        var resourceState$jscomp$0 = resources.hasOwnProperty(key)
          ? resources[key]
          : void 0;
        if (null !== resourceState$jscomp$0) {
          resources[key] = null;
          var scriptProps = props;
          if (resourceState$jscomp$0) {
            2 === resourceState$jscomp$0.length &&
              ((scriptProps = assign({}, props)),
              adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
            var preloadResource$jscomp$0 = preloads.get(key);
            preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
          }
          var resource$jscomp$0 = [];
          renderState.scripts.add(resource$jscomp$0);
          pushScriptImpl(resource$jscomp$0, scriptProps);
        }
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
        JSCompiler_inline_result$jscomp$5 = null;
      }
      return JSCompiler_inline_result$jscomp$5;
    case "style":
      var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1,
        precedence$jscomp$0 = props.precedence,
        href$jscomp$0 = props.href,
        nonce = props.nonce;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$2 ||
        null != props.itemProp ||
        "string" !== typeof precedence$jscomp$0 ||
        "string" !== typeof href$jscomp$0 ||
        "" === href$jscomp$0
      ) {
        target$jscomp$0.push(startChunkForTag("style"));
        var children$jscomp$6 = null,
          innerHTML$jscomp$5 = null,
          propKey$jscomp$8;
        for (propKey$jscomp$8 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$8)) {
            var propValue$jscomp$8 = props[propKey$jscomp$8];
            if (null != propValue$jscomp$8)
              switch (propKey$jscomp$8) {
                case "children":
                  children$jscomp$6 = propValue$jscomp$8;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$5 = propValue$jscomp$8;
                  break;
                default:
                  pushAttribute(
                    target$jscomp$0,
                    propKey$jscomp$8,
                    propValue$jscomp$8
                  );
              }
          }
        target$jscomp$0.push(">");
        var child = Array.isArray(children$jscomp$6)
          ? 2 > children$jscomp$6.length
            ? children$jscomp$6[0]
            : null
          : children$jscomp$6;
        "function" !== typeof child &&
          "symbol" !== typeof child &&
          null !== child &&
          void 0 !== child &&
          target$jscomp$0.push(("" + child).replace(styleRegex, styleReplacer));
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
        target$jscomp$0.push(endChunkForTag("style"));
        var JSCompiler_inline_result$jscomp$6 = null;
      } else {
        var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
        if (
          null !==
          (resumableState.styleResources.hasOwnProperty(href$jscomp$0)
            ? resumableState.styleResources[href$jscomp$0]
            : void 0)
        ) {
          resumableState.styleResources[href$jscomp$0] = null;
          styleQueue$jscomp$0 ||
            ((styleQueue$jscomp$0 = {
              precedence: escapeTextForBrowser(precedence$jscomp$0),
              rules: [],
              hrefs: [],
              sheets: new Map()
            }),
            renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
          var nonceStyle = renderState.nonce.style;
          if (!nonceStyle || nonceStyle === nonce) {
            styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
            var target = styleQueue$jscomp$0.rules,
              children$jscomp$7 = null,
              innerHTML$jscomp$6 = null,
              propKey$jscomp$9;
            for (propKey$jscomp$9 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                var propValue$jscomp$9 = props[propKey$jscomp$9];
                if (null != propValue$jscomp$9)
                  switch (propKey$jscomp$9) {
                    case "children":
                      children$jscomp$7 = propValue$jscomp$9;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$6 = propValue$jscomp$9;
                  }
              }
            var child$jscomp$0 = Array.isArray(children$jscomp$7)
              ? 2 > children$jscomp$7.length
                ? children$jscomp$7[0]
                : null
              : children$jscomp$7;
            "function" !== typeof child$jscomp$0 &&
              "symbol" !== typeof child$jscomp$0 &&
              null !== child$jscomp$0 &&
              void 0 !== child$jscomp$0 &&
              target.push(
                ("" + child$jscomp$0).replace(styleRegex, styleReplacer)
              );
            pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
          }
        }
        styleQueue$jscomp$0 &&
          hoistableState &&
          hoistableState.styles.add(styleQueue$jscomp$0);
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e");
        JSCompiler_inline_result$jscomp$6 = void 0;
      }
      return JSCompiler_inline_result$jscomp$6;
    case "meta":
      var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1,
        isFallback$jscomp$1 = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$3 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(
          target$jscomp$0,
          props,
          "meta"
        );
      else
        textEmbedded && target$jscomp$0.push("\x3c!-- --\x3e"),
          (JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1
            ? null
            : "string" === typeof props.charSet
              ? pushSelfClosing(renderState.charsetChunks, props, "meta")
              : "viewport" === props.name
                ? pushSelfClosing(renderState.viewportChunks, props, "meta")
                : pushSelfClosing(renderState.hoistableChunks, props, "meta"));
      return JSCompiler_inline_result$jscomp$7;
    case "listing":
    case "pre":
      target$jscomp$0.push(startChunkForTag(type));
      var children$jscomp$8 = null,
        innerHTML$jscomp$7 = null,
        propKey$jscomp$10;
      for (propKey$jscomp$10 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$10)) {
          var propValue$jscomp$10 = props[propKey$jscomp$10];
          if (null != propValue$jscomp$10)
            switch (propKey$jscomp$10) {
              case "children":
                children$jscomp$8 = propValue$jscomp$10;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$7 = propValue$jscomp$10;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$10,
                  propValue$jscomp$10
                );
            }
        }
      target$jscomp$0.push(">");
      if (null != innerHTML$jscomp$7) {
        if (null != children$jscomp$8) throw Error(formatProdErrorMessage(60));
        if (
          "object" !== typeof innerHTML$jscomp$7 ||
          !("__html" in innerHTML$jscomp$7)
        )
          throw Error(formatProdErrorMessage(61));
        var html = innerHTML$jscomp$7.__html;
        null !== html &&
          void 0 !== html &&
          ("string" === typeof html && 0 < html.length && "\n" === html[0]
            ? target$jscomp$0.push("\n", html)
            : target$jscomp$0.push("" + html));
      }
      "string" === typeof children$jscomp$8 &&
        "\n" === children$jscomp$8[0] &&
        target$jscomp$0.push("\n");
      return children$jscomp$8;
    case "img":
      var pictureOrNoScriptTagInScope = formatContext.tagScope & 3,
        src = props.src,
        srcSet = props.srcSet;
      if (
        !(
          "lazy" === props.loading ||
          (!src && !srcSet) ||
          ("string" !== typeof src && null != src) ||
          ("string" !== typeof srcSet && null != srcSet) ||
          "low" === props.fetchPriority ||
          pictureOrNoScriptTagInScope
        ) &&
        ("string" !== typeof src ||
          ":" !== src[4] ||
          ("d" !== src[0] && "D" !== src[0]) ||
          ("a" !== src[1] && "A" !== src[1]) ||
          ("t" !== src[2] && "T" !== src[2]) ||
          ("a" !== src[3] && "A" !== src[3])) &&
        ("string" !== typeof srcSet ||
          ":" !== srcSet[4] ||
          ("d" !== srcSet[0] && "D" !== srcSet[0]) ||
          ("a" !== srcSet[1] && "A" !== srcSet[1]) ||
          ("t" !== srcSet[2] && "T" !== srcSet[2]) ||
          ("a" !== srcSet[3] && "A" !== srcSet[3]))
      ) {
        null !== hoistableState &&
          formatContext.tagScope & 64 &&
          (hoistableState.suspenseyImages = !0);
        var sizes = "string" === typeof props.sizes ? props.sizes : void 0,
          key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src,
          promotablePreloads = renderState.preloads.images,
          resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
        if (resource$jscomp$1) {
          if (
            "high" === props.fetchPriority ||
            10 > renderState.highImagePreloads.size
          )
            promotablePreloads.delete(key$jscomp$0),
              renderState.highImagePreloads.add(resource$jscomp$1);
        } else if (
          !resumableState.imageResources.hasOwnProperty(key$jscomp$0)
        ) {
          resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
          var input = props.crossOrigin;
          var JSCompiler_inline_result$jscomp$8 =
            "string" === typeof input
              ? "use-credentials" === input
                ? input
                : ""
              : void 0;
          var headers = renderState.headers,
            header;
          headers &&
          0 < headers.remainingCapacity &&
          "string" !== typeof props.srcSet &&
          ("high" === props.fetchPriority ||
            500 > headers.highImagePreloads.length) &&
          ((header = getPreloadAsHeader(src, "image", {
            imageSrcSet: props.srcSet,
            imageSizes: props.sizes,
            crossOrigin: JSCompiler_inline_result$jscomp$8,
            integrity: props.integrity,
            nonce: props.nonce,
            type: props.type,
            fetchPriority: props.fetchPriority,
            referrerPolicy: props.refererPolicy
          })),
          0 <= (headers.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS),
              headers.highImagePreloads && (headers.highImagePreloads += ", "),
              (headers.highImagePreloads += header))
            : ((resource$jscomp$1 = []),
              pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? void 0 : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }),
              "high" === props.fetchPriority ||
              10 > renderState.highImagePreloads.size
                ? renderState.highImagePreloads.add(resource$jscomp$1)
                : (renderState.bulkPreloads.add(resource$jscomp$1),
                  promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
        }
      }
      return pushSelfClosing(target$jscomp$0, props, "img");
    case "base":
    case "area":
    case "br":
    case "col":
    case "embed":
    case "hr":
    case "keygen":
    case "param":
    case "source":
    case "track":
    case "wbr":
      return pushSelfClosing(target$jscomp$0, props, type);
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      break;
    case "head":
      if (2 > formatContext.insertionMode) {
        var preamble = preambleState || renderState.preamble;
        if (preamble.headChunks)
          throw Error(formatProdErrorMessage(545, "`<head>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--head--\x3e");
        preamble.headChunks = [];
        var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(
          preamble.headChunks,
          props,
          "head"
        );
      } else
        JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "head"
        );
      return JSCompiler_inline_result$jscomp$9;
    case "body":
      if (2 > formatContext.insertionMode) {
        var preamble$jscomp$0 = preambleState || renderState.preamble;
        if (preamble$jscomp$0.bodyChunks)
          throw Error(formatProdErrorMessage(545, "`<body>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--body--\x3e");
        preamble$jscomp$0.bodyChunks = [];
        var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(
          preamble$jscomp$0.bodyChunks,
          props,
          "body"
        );
      } else
        JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "body"
        );
      return JSCompiler_inline_result$jscomp$10;
    case "html":
      if (0 === formatContext.insertionMode) {
        var preamble$jscomp$1 = preambleState || renderState.preamble;
        if (preamble$jscomp$1.htmlChunks)
          throw Error(formatProdErrorMessage(545, "`<html>`"));
        null !== preambleState && target$jscomp$0.push("\x3c!--html--\x3e");
        preamble$jscomp$1.htmlChunks = [""];
        var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(
          preamble$jscomp$1.htmlChunks,
          props,
          "html"
        );
      } else
        JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "html"
        );
      return JSCompiler_inline_result$jscomp$11;
    default:
      if (-1 !== type.indexOf("-")) {
        target$jscomp$0.push(startChunkForTag(type));
        var children$jscomp$9 = null,
          innerHTML$jscomp$8 = null,
          propKey$jscomp$11;
        for (propKey$jscomp$11 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$11)) {
            var propValue$jscomp$11 = props[propKey$jscomp$11];
            if (null != propValue$jscomp$11) {
              var attributeName = propKey$jscomp$11;
              switch (propKey$jscomp$11) {
                case "children":
                  children$jscomp$9 = propValue$jscomp$11;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$8 = propValue$jscomp$11;
                  break;
                case "style":
                  pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                  break;
                case "suppressContentEditableWarning":
                case "suppressHydrationWarning":
                case "ref":
                  break;
                case "className":
                  attributeName = "class";
                default:
                  if (
                    isAttributeNameSafe(propKey$jscomp$11) &&
                    "function" !== typeof propValue$jscomp$11 &&
                    "symbol" !== typeof propValue$jscomp$11 &&
                    !1 !== propValue$jscomp$11
                  ) {
                    if (!0 === propValue$jscomp$11) propValue$jscomp$11 = "";
                    else if ("object" === typeof propValue$jscomp$11) continue;
                    target$jscomp$0.push(
                      " ",
                      attributeName,
                      '="',
                      escapeTextForBrowser(propValue$jscomp$11),
                      '"'
                    );
                  }
              }
            }
          }
        target$jscomp$0.push(">");
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
        return children$jscomp$9;
      }
  }
  return pushStartGenericElement(target$jscomp$0, props, type);
}
var endTagCache = new Map();
function endChunkForTag(tag) {
  var chunk = endTagCache.get(tag);
  void 0 === chunk && ((chunk = "</" + tag + ">"), endTagCache.set(tag, chunk));
  return chunk;
}
function hoistPreambleState(renderState, preambleState) {
  renderState = renderState.preamble;
  null === renderState.htmlChunks &&
    preambleState.htmlChunks &&
    (renderState.htmlChunks = preambleState.htmlChunks);
  null === renderState.headChunks &&
    preambleState.headChunks &&
    (renderState.headChunks = preambleState.headChunks);
  null === renderState.bodyChunks &&
    preambleState.bodyChunks &&
    (renderState.bodyChunks = preambleState.bodyChunks);
}
function writeBootstrap(destination, renderState) {
  renderState = renderState.bootstrapChunks;
  for (var i = 0; i < renderState.length - 1; i++)
    destination.push(renderState[i]);
  return i < renderState.length
    ? ((i = renderState[i]), (renderState.length = 0), destination.push(i))
    : !0;
}
function writeStartPendingSuspenseBoundary(destination, renderState, id) {
  destination.push('\x3c!--$?--\x3e<template id="');
  if (null === id) throw Error(formatProdErrorMessage(395));
  destination.push(renderState.boundaryPrefix);
  renderState = id.toString(16);
  destination.push(renderState);
  return destination.push('"></template>');
}
function writeStartSegment(destination, renderState, formatContext, id) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return (
        destination.push('<div hidden id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 4:
      return (
        destination.push('<svg aria-hidden="true" style="display:none" id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 5:
      return (
        destination.push('<math aria-hidden="true" style="display:none" id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 6:
      return (
        destination.push('<table hidden id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 7:
      return (
        destination.push('<table hidden><tbody id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 8:
      return (
        destination.push('<table hidden><tr id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    case 9:
      return (
        destination.push('<table hidden><colgroup id="'),
        destination.push(renderState.segmentPrefix),
        (renderState = id.toString(16)),
        destination.push(renderState),
        destination.push('">')
      );
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
function writeEndSegment(destination, formatContext) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return destination.push("</div>");
    case 4:
      return destination.push("</svg>");
    case 5:
      return destination.push("</math>");
    case 6:
      return destination.push("</table>");
    case 7:
      return destination.push("</tbody></table>");
    case 8:
      return destination.push("</tr></table>");
    case 9:
      return destination.push("</colgroup></table>");
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
function escapeJSStringsForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInInstructionScripts,
    function (match) {
      switch (match) {
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
function escapeJSObjectForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInScripts,
    function (match) {
      switch (match) {
        case "&":
          return "\\u0026";
        case ">":
          return "\\u003e";
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var currentlyRenderingBoundaryHasStylesToHoist = !1,
  destinationHasCapacity = !0;
function flushStyleTagsLateForBoundary(styleQueue) {
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs,
    i = 0;
  if (hrefs.length) {
    this.push(currentlyFlushingRenderState.startInlineStyle);
    this.push(' media="not all" data-precedence="');
    this.push(styleQueue.precedence);
    for (this.push('" data-href="'); i < hrefs.length - 1; i++)
      this.push(hrefs[i]), this.push(" ");
    this.push(hrefs[i]);
    this.push('">');
    for (i = 0; i < rules.length; i++) this.push(rules[i]);
    destinationHasCapacity = this.push("</style>");
    currentlyRenderingBoundaryHasStylesToHoist = !0;
    rules.length = 0;
    hrefs.length = 0;
  }
}
function hasStylesToHoist(stylesheet) {
  return 2 !== stylesheet.state
    ? (currentlyRenderingBoundaryHasStylesToHoist = !0)
    : !1;
}
function writeHoistablesForBoundary(destination, hoistableState, renderState) {
  currentlyRenderingBoundaryHasStylesToHoist = !1;
  destinationHasCapacity = !0;
  currentlyFlushingRenderState = renderState;
  hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
  currentlyFlushingRenderState = null;
  hoistableState.stylesheets.forEach(hasStylesToHoist);
  currentlyRenderingBoundaryHasStylesToHoist &&
    (renderState.stylesToHoist = !0);
  return destinationHasCapacity;
}
function flushResource(resource) {
  for (var i = 0; i < resource.length; i++) this.push(resource[i]);
  resource.length = 0;
}
var stylesheetFlushingQueue = [];
function flushStyleInPreamble(stylesheet) {
  pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
  for (var i = 0; i < stylesheetFlushingQueue.length; i++)
    this.push(stylesheetFlushingQueue[i]);
  stylesheetFlushingQueue.length = 0;
  stylesheet.state = 2;
}
function flushStylesInPreamble(styleQueue) {
  var hasStylesheets = 0 < styleQueue.sheets.size;
  styleQueue.sheets.forEach(flushStyleInPreamble, this);
  styleQueue.sheets.clear();
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs;
  if (!hasStylesheets || hrefs.length) {
    this.push(currentlyFlushingRenderState.startInlineStyle);
    this.push(' data-precedence="');
    this.push(styleQueue.precedence);
    styleQueue = 0;
    if (hrefs.length) {
      for (
        this.push('" data-href="');
        styleQueue < hrefs.length - 1;
        styleQueue++
      )
        this.push(hrefs[styleQueue]), this.push(" ");
      this.push(hrefs[styleQueue]);
    }
    this.push('">');
    for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
      this.push(rules[styleQueue]);
    this.push("</style>");
    rules.length = 0;
    hrefs.length = 0;
  }
}
function preloadLateStyle(stylesheet) {
  if (0 === stylesheet.state) {
    stylesheet.state = 1;
    var props = stylesheet.props;
    pushLinkImpl(stylesheetFlushingQueue, {
      rel: "preload",
      as: "style",
      href: stylesheet.props.href,
      crossOrigin: props.crossOrigin,
      fetchPriority: props.fetchPriority,
      integrity: props.integrity,
      media: props.media,
      hrefLang: props.hrefLang,
      referrerPolicy: props.referrerPolicy
    });
    for (
      stylesheet = 0;
      stylesheet < stylesheetFlushingQueue.length;
      stylesheet++
    )
      this.push(stylesheetFlushingQueue[stylesheet]);
    stylesheetFlushingQueue.length = 0;
  }
}
function preloadLateStyles(styleQueue) {
  styleQueue.sheets.forEach(preloadLateStyle, this);
  styleQueue.sheets.clear();
}
function pushCompletedShellIdAttribute(target, resumableState) {
  0 === (resumableState.instructions & 32) &&
    ((resumableState.instructions |= 32),
    target.push(
      ' id="',
      escapeTextForBrowser("_" + resumableState.idPrefix + "R_"),
      '"'
    ));
}
function writeStyleResourceDependenciesInJS(destination, hoistableState) {
  destination.push("[");
  var nextArrayOpenBrackChunk = "[";
  hoistableState.stylesheets.forEach(function (resource) {
    if (2 !== resource.state)
      if (3 === resource.state)
        destination.push(nextArrayOpenBrackChunk),
          (resource = escapeJSObjectForInstructionScripts(
            "" + resource.props.href
          )),
          destination.push(resource),
          destination.push("]"),
          (nextArrayOpenBrackChunk = ",[");
      else {
        destination.push(nextArrayOpenBrackChunk);
        var precedence = resource.props["data-precedence"],
          props = resource.props,
          coercedHref = sanitizeURL("" + resource.props.href);
        coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
        destination.push(coercedHref);
        precedence = "" + precedence;
        destination.push(",");
        precedence = escapeJSObjectForInstructionScripts(precedence);
        destination.push(precedence);
        for (var propKey in props)
          if (
            hasOwnProperty.call(props, propKey) &&
            ((precedence = props[propKey]), null != precedence)
          )
            switch (propKey) {
              case "href":
              case "rel":
              case "precedence":
              case "data-precedence":
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "link"));
              default:
                writeStyleResourceAttributeInJS(
                  destination,
                  propKey,
                  precedence
                );
            }
        destination.push("]");
        nextArrayOpenBrackChunk = ",[";
        resource.state = 3;
      }
  });
  destination.push("]");
}
function writeStyleResourceAttributeInJS(destination, name, value) {
  var attributeName = name.toLowerCase();
  switch (typeof value) {
    case "function":
    case "symbol":
      return;
  }
  switch (name) {
    case "innerHTML":
    case "dangerouslySetInnerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "style":
    case "ref":
      return;
    case "className":
      attributeName = "class";
      name = "" + value;
      break;
    case "hidden":
      if (!1 === value) return;
      name = "";
      break;
    case "src":
    case "href":
      value = sanitizeURL(value);
      name = "" + value;
      break;
    default:
      if (
        (2 < name.length &&
          ("o" === name[0] || "O" === name[0]) &&
          ("n" === name[1] || "N" === name[1])) ||
        !isAttributeNameSafe(name)
      )
        return;
      name = "" + value;
  }
  destination.push(",");
  attributeName = escapeJSObjectForInstructionScripts(attributeName);
  destination.push(attributeName);
  destination.push(",");
  attributeName = escapeJSObjectForInstructionScripts(name);
  destination.push(attributeName);
}
function createHoistableState() {
  return { styles: new Set(), stylesheets: new Set(), suspenseyImages: !1 };
}
function prefetchDNS(href) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      if (!resumableState.dnsResources.hasOwnProperty(href)) {
        resumableState.dnsResources[href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        )
          JSCompiler_temp =
            ((header =
              "<" +
              ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) +
              ">; rel=dns-prefetch"),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        JSCompiler_temp
          ? ((renderState.resets.dns[href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((header = []),
            pushLinkImpl(header, { href: href, rel: "dns-prefetch" }),
            renderState.preconnects.add(header));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.D(href);
}
function preconnect(href, crossOrigin) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      var bucket =
        "use-credentials" === crossOrigin
          ? "credentials"
          : "string" === typeof crossOrigin
            ? "anonymous"
            : "default";
      if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
        resumableState.connectResources[bucket][href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        ) {
          JSCompiler_temp =
            "<" +
            ("" + href).replace(
              regexForHrefInLinkHeaderURLContext,
              escapeHrefForLinkHeaderURLContextReplacer
            ) +
            ">; rel=preconnect";
          if ("string" === typeof crossOrigin) {
            var escapedCrossOrigin = ("" + crossOrigin).replace(
              regexForLinkHeaderQuotedParamValueContext,
              escapeStringForLinkHeaderQuotedParamValueContextReplacer
            );
            JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
          }
          JSCompiler_temp =
            ((header = JSCompiler_temp),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        }
        JSCompiler_temp
          ? ((renderState.resets.connect[bucket][href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((bucket = []),
            pushLinkImpl(bucket, {
              rel: "preconnect",
              href: href,
              crossOrigin: crossOrigin
            }),
            renderState.preconnects.add(bucket));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.C(href, crossOrigin);
}
function preload(href, as, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (as && href) {
      switch (as) {
        case "image":
          if (options) {
            var imageSrcSet = options.imageSrcSet;
            var imageSizes = options.imageSizes;
            var fetchPriority = options.fetchPriority;
          }
          var key = imageSrcSet
            ? imageSrcSet + "\n" + (imageSizes || "")
            : href;
          if (resumableState.imageResources.hasOwnProperty(key)) return;
          resumableState.imageResources[key] = PRELOAD_NO_CREDS;
          resumableState = renderState.headers;
          var header;
          resumableState &&
          0 < resumableState.remainingCapacity &&
          "string" !== typeof imageSrcSet &&
          "high" === fetchPriority &&
          ((header = getPreloadAsHeader(href, as, options)),
          0 <= (resumableState.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key] = PRELOAD_NO_CREDS),
              resumableState.highImagePreloads &&
                (resumableState.highImagePreloads += ", "),
              (resumableState.highImagePreloads += header))
            : ((resumableState = []),
              pushLinkImpl(
                resumableState,
                assign(
                  { rel: "preload", href: imageSrcSet ? void 0 : href, as: as },
                  options
                )
              ),
              "high" === fetchPriority
                ? renderState.highImagePreloads.add(resumableState)
                : (renderState.bulkPreloads.add(resumableState),
                  renderState.preloads.images.set(key, resumableState)));
          break;
        case "style":
          if (resumableState.styleResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.styleResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.stylesheets.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          break;
        case "script":
          if (resumableState.scriptResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          renderState.preloads.scripts.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.scriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          break;
        default:
          if (resumableState.unknownResources.hasOwnProperty(as)) {
            if (
              ((imageSrcSet = resumableState.unknownResources[as]),
              imageSrcSet.hasOwnProperty(href))
            )
              return;
          } else
            (imageSrcSet = {}),
              (resumableState.unknownResources[as] = imageSrcSet);
          imageSrcSet[href] = PRELOAD_NO_CREDS;
          if (
            (resumableState = renderState.headers) &&
            0 < resumableState.remainingCapacity &&
            "font" === as &&
            ((key = getPreloadAsHeader(href, as, options)),
            0 <= (resumableState.remainingCapacity -= key.length + 2))
          )
            (renderState.resets.font[href] = PRELOAD_NO_CREDS),
              resumableState.fontPreloads &&
                (resumableState.fontPreloads += ", "),
              (resumableState.fontPreloads += key);
          else
            switch (
              ((resumableState = []),
              (href = assign({ rel: "preload", href: href, as: as }, options)),
              pushLinkImpl(resumableState, href),
              as)
            ) {
              case "font":
                renderState.fontPreloads.add(resumableState);
                break;
              default:
                renderState.bulkPreloads.add(resumableState);
            }
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.L(href, as, options);
}
function preloadModule(href, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      var as =
        options && "string" === typeof options.as ? options.as : "script";
      switch (as) {
        case "script":
          if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
          as = [];
          resumableState.moduleScriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.moduleScripts.set(href, as);
          break;
        default:
          if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
            var resources = resumableState.unknownResources[as];
            if (resources.hasOwnProperty(href)) return;
          } else
            (resources = {}),
              (resumableState.moduleUnknownResources[as] = resources);
          as = [];
          resources[href] = PRELOAD_NO_CREDS;
      }
      pushLinkImpl(as, assign({ rel: "modulepreload", href: href }, options));
      renderState.bulkPreloads.add(as);
      enqueueFlush(request);
    }
  } else previousDispatcher.m(href, options);
}
function preinitStyle(href, precedence, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      precedence = precedence || "default";
      var styleQueue = renderState.styles.get(precedence),
        resourceState = resumableState.styleResources.hasOwnProperty(href)
          ? resumableState.styleResources[href]
          : void 0;
      null !== resourceState &&
        ((resumableState.styleResources[href] = null),
        styleQueue ||
          ((styleQueue = {
            precedence: escapeTextForBrowser(precedence),
            rules: [],
            hrefs: [],
            sheets: new Map()
          }),
          renderState.styles.set(precedence, styleQueue)),
        (precedence = {
          state: 0,
          props: assign(
            { rel: "stylesheet", href: href, "data-precedence": precedence },
            options
          )
        }),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(precedence.props, resourceState),
          (renderState = renderState.preloads.stylesheets.get(href)) &&
          0 < renderState.length
            ? (renderState.length = 0)
            : (precedence.state = 1)),
        styleQueue.sheets.set(href, precedence),
        enqueueFlush(request));
    }
  } else previousDispatcher.S(href, precedence, options);
}
function preinitScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.scriptResources.hasOwnProperty(src)
        ? resumableState.scriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.scriptResources[src] = null),
        (options = assign({ src: src, async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.scripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.X(src, options);
}
function preinitModuleScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.moduleScriptResources.hasOwnProperty(
        src
      )
        ? resumableState.moduleScriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.moduleScriptResources[src] = null),
        (options = assign({ src: src, type: "module", async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.moduleScripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.M(src, options);
}
function adoptPreloadCredentials(target, preloadState) {
  null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
  null == target.integrity && (target.integrity = preloadState[1]);
}
function getPreloadAsHeader(href, as, params) {
  href = ("" + href).replace(
    regexForHrefInLinkHeaderURLContext,
    escapeHrefForLinkHeaderURLContextReplacer
  );
  as = ("" + as).replace(
    regexForLinkHeaderQuotedParamValueContext,
    escapeStringForLinkHeaderQuotedParamValueContextReplacer
  );
  as = "<" + href + '>; rel=preload; as="' + as + '"';
  for (var paramName in params)
    hasOwnProperty.call(params, paramName) &&
      ((href = params[paramName]),
      "string" === typeof href &&
        (as +=
          "; " +
          paramName.toLowerCase() +
          '="' +
          ("" + href).replace(
            regexForLinkHeaderQuotedParamValueContext,
            escapeStringForLinkHeaderQuotedParamValueContextReplacer
          ) +
          '"'));
  return as;
}
var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
function escapeHrefForLinkHeaderURLContextReplacer(match) {
  switch (match) {
    case "<":
      return "%3C";
    case ">":
      return "%3E";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
  switch (match) {
    case '"':
      return "%22";
    case "'":
      return "%27";
    case ";":
      return "%3B";
    case ",":
      return "%2C";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
function hoistStyleQueueDependency(styleQueue) {
  this.styles.add(styleQueue);
}
function hoistStylesheetDependency(stylesheet) {
  this.stylesheets.add(stylesheet);
}
function hoistHoistables(parentState, childState) {
  childState.styles.forEach(hoistStyleQueueDependency, parentState);
  childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
  childState.suspenseyImages && (parentState.suspenseyImages = !0);
}
function createRenderState(resumableState, generateStaticMarkup) {
  var idPrefix = resumableState.idPrefix,
    bootstrapChunks = [],
    bootstrapScriptContent = resumableState.bootstrapScriptContent,
    bootstrapScripts = resumableState.bootstrapScripts,
    bootstrapModules = resumableState.bootstrapModules;
  void 0 !== bootstrapScriptContent &&
    (bootstrapChunks.push("<script"),
    pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
    bootstrapChunks.push(
      ">",
      ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer),
      "\x3c/script>"
    ));
  bootstrapScriptContent = idPrefix + "P:";
  var JSCompiler_object_inline_segmentPrefix_1673 = idPrefix + "S:";
  idPrefix += "B:";
  var JSCompiler_object_inline_preconnects_1687 = new Set(),
    JSCompiler_object_inline_fontPreloads_1688 = new Set(),
    JSCompiler_object_inline_highImagePreloads_1689 = new Set(),
    JSCompiler_object_inline_styles_1690 = new Map(),
    JSCompiler_object_inline_bootstrapScripts_1691 = new Set(),
    JSCompiler_object_inline_scripts_1692 = new Set(),
    JSCompiler_object_inline_bulkPreloads_1693 = new Set(),
    JSCompiler_object_inline_preloads_1694 = {
      images: new Map(),
      stylesheets: new Map(),
      scripts: new Map(),
      moduleScripts: new Map()
    };
  if (void 0 !== bootstrapScripts)
    for (var i = 0; i < bootstrapScripts.length; i++) {
      var scriptConfig = bootstrapScripts[i],
        src,
        crossOrigin = void 0,
        integrity = void 0,
        props = {
          rel: "preload",
          as: "script",
          fetchPriority: "low",
          nonce: void 0
        };
      "string" === typeof scriptConfig
        ? (props.href = src = scriptConfig)
        : ((props.href = src = scriptConfig.src),
          (props.integrity = integrity =
            "string" === typeof scriptConfig.integrity
              ? scriptConfig.integrity
              : void 0),
          (props.crossOrigin = crossOrigin =
            "string" === typeof scriptConfig || null == scriptConfig.crossOrigin
              ? void 0
              : "use-credentials" === scriptConfig.crossOrigin
                ? "use-credentials"
                : ""));
      scriptConfig = resumableState;
      var href = src;
      scriptConfig.scriptResources[href] = null;
      scriptConfig.moduleScriptResources[href] = null;
      scriptConfig = [];
      pushLinkImpl(scriptConfig, props);
      JSCompiler_object_inline_bootstrapScripts_1691.add(scriptConfig);
      bootstrapChunks.push('<script src="', escapeTextForBrowser(src), '"');
      "string" === typeof integrity &&
        bootstrapChunks.push(
          ' integrity="',
          escapeTextForBrowser(integrity),
          '"'
        );
      "string" === typeof crossOrigin &&
        bootstrapChunks.push(
          ' crossorigin="',
          escapeTextForBrowser(crossOrigin),
          '"'
        );
      pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
      bootstrapChunks.push(' async="">\x3c/script>');
    }
  if (void 0 !== bootstrapModules)
    for (
      bootstrapScripts = 0;
      bootstrapScripts < bootstrapModules.length;
      bootstrapScripts++
    )
      (props = bootstrapModules[bootstrapScripts]),
        (crossOrigin = src = void 0),
        (integrity = {
          rel: "modulepreload",
          fetchPriority: "low",
          nonce: void 0
        }),
        "string" === typeof props
          ? (integrity.href = i = props)
          : ((integrity.href = i = props.src),
            (integrity.integrity = crossOrigin =
              "string" === typeof props.integrity ? props.integrity : void 0),
            (integrity.crossOrigin = src =
              "string" === typeof props || null == props.crossOrigin
                ? void 0
                : "use-credentials" === props.crossOrigin
                  ? "use-credentials"
                  : "")),
        (props = resumableState),
        (scriptConfig = i),
        (props.scriptResources[scriptConfig] = null),
        (props.moduleScriptResources[scriptConfig] = null),
        (props = []),
        pushLinkImpl(props, integrity),
        JSCompiler_object_inline_bootstrapScripts_1691.add(props),
        bootstrapChunks.push(
          '<script type="module" src="',
          escapeTextForBrowser(i),
          '"'
        ),
        "string" === typeof crossOrigin &&
          bootstrapChunks.push(
            ' integrity="',
            escapeTextForBrowser(crossOrigin),
            '"'
          ),
        "string" === typeof src &&
          bootstrapChunks.push(
            ' crossorigin="',
            escapeTextForBrowser(src),
            '"'
          ),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(' async="">\x3c/script>');
  return {
    placeholderPrefix: bootstrapScriptContent,
    segmentPrefix: JSCompiler_object_inline_segmentPrefix_1673,
    boundaryPrefix: idPrefix,
    startInlineScript: "<script",
    startInlineStyle: "<style",
    preamble: { htmlChunks: null, headChunks: null, bodyChunks: null },
    externalRuntimeScript: null,
    bootstrapChunks: bootstrapChunks,
    importMapChunks: [],
    onHeaders: void 0,
    headers: null,
    resets: {
      font: {},
      dns: {},
      connect: { default: {}, anonymous: {}, credentials: {} },
      image: {},
      style: {}
    },
    charsetChunks: [],
    viewportChunks: [],
    hoistableChunks: [],
    preconnects: JSCompiler_object_inline_preconnects_1687,
    fontPreloads: JSCompiler_object_inline_fontPreloads_1688,
    highImagePreloads: JSCompiler_object_inline_highImagePreloads_1689,
    styles: JSCompiler_object_inline_styles_1690,
    bootstrapScripts: JSCompiler_object_inline_bootstrapScripts_1691,
    scripts: JSCompiler_object_inline_scripts_1692,
    bulkPreloads: JSCompiler_object_inline_bulkPreloads_1693,
    preloads: JSCompiler_object_inline_preloads_1694,
    nonce: { script: void 0, style: void 0 },
    stylesToHoist: !1,
    generateStaticMarkup: generateStaticMarkup
  };
}
function pushTextInstance(target, text, renderState, textEmbedded) {
  if (renderState.generateStaticMarkup)
    return target.push(escapeTextForBrowser(text)), !1;
  "" === text
    ? (target = textEmbedded)
    : (textEmbedded && target.push("\x3c!-- --\x3e"),
      target.push(escapeTextForBrowser(text)),
      (target = !0));
  return target;
}
function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
  renderState.generateStaticMarkup ||
    (lastPushedText && textEmbedded && target.push("\x3c!-- --\x3e"));
}
var bind = Function.prototype.bind,
  REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type) {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
var emptyContextObject = {},
  currentActiveSnapshot = null;
function popToNearestCommonAncestor(prev, next) {
  if (prev !== next) {
    prev.context._currentValue2 = prev.parentValue;
    prev = prev.parent;
    var parentNext = next.parent;
    if (null === prev) {
      if (null !== parentNext) throw Error(formatProdErrorMessage(401));
    } else {
      if (null === parentNext) throw Error(formatProdErrorMessage(401));
      popToNearestCommonAncestor(prev, parentNext);
    }
    next.context._currentValue2 = next.value;
  }
}
function popAllPrevious(prev) {
  prev.context._currentValue2 = prev.parentValue;
  prev = prev.parent;
  null !== prev && popAllPrevious(prev);
}
function pushAllNext(next) {
  var parentNext = next.parent;
  null !== parentNext && pushAllNext(parentNext);
  next.context._currentValue2 = next.value;
}
function popPreviousToCommonLevel(prev, next) {
  prev.context._currentValue2 = prev.parentValue;
  prev = prev.parent;
  if (null === prev) throw Error(formatProdErrorMessage(402));
  prev.depth === next.depth
    ? popToNearestCommonAncestor(prev, next)
    : popPreviousToCommonLevel(prev, next);
}
function popNextToCommonLevel(prev, next) {
  var parentNext = next.parent;
  if (null === parentNext) throw Error(formatProdErrorMessage(402));
  prev.depth === parentNext.depth
    ? popToNearestCommonAncestor(prev, parentNext)
    : popNextToCommonLevel(prev, parentNext);
  next.context._currentValue2 = next.value;
}
function switchContext(newSnapshot) {
  var prev = currentActiveSnapshot;
  prev !== newSnapshot &&
    (null === prev
      ? pushAllNext(newSnapshot)
      : null === newSnapshot
        ? popAllPrevious(prev)
        : prev.depth === newSnapshot.depth
          ? popToNearestCommonAncestor(prev, newSnapshot)
          : prev.depth > newSnapshot.depth
            ? popPreviousToCommonLevel(prev, newSnapshot)
            : popNextToCommonLevel(prev, newSnapshot),
    (currentActiveSnapshot = newSnapshot));
}
var classComponentUpdater = {
    enqueueSetState: function (inst, payload) {
      inst = inst._reactInternals;
      null !== inst.queue && inst.queue.push(payload);
    },
    enqueueReplaceState: function (inst, payload) {
      inst = inst._reactInternals;
      inst.replace = !0;
      inst.queue = [payload];
    },
    enqueueForceUpdate: function () {}
  },
  emptyTreeContext = { id: 1, overflow: "" };
function pushTreeContext(baseContext, totalChildren, index) {
  var baseIdWithLeadingBit = baseContext.id;
  baseContext = baseContext.overflow;
  var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
  baseIdWithLeadingBit &= ~(1 << baseLength);
  index += 1;
  var length = 32 - clz32(totalChildren) + baseLength;
  if (30 < length) {
    var numberOfOverflowBits = baseLength - (baseLength % 5);
    length = (
      baseIdWithLeadingBit &
      ((1 << numberOfOverflowBits) - 1)
    ).toString(32);
    baseIdWithLeadingBit >>= numberOfOverflowBits;
    baseLength -= numberOfOverflowBits;
    return {
      id:
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit,
      overflow: length + baseContext
    };
  }
  return {
    id: (1 << length) | (index << baseLength) | baseIdWithLeadingBit,
    overflow: baseContext
  };
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x) {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
function noop() {}
var SuspenseException = Error(formatProdErrorMessage(460));
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      "string" === typeof thenable.status
        ? thenable.then(noop, noop)
        : ((thenableState = thenable),
          (thenableState.status = "pending"),
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
function is(x, y) {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is,
  currentlyRenderingComponent = null,
  currentlyRenderingTask = null,
  currentlyRenderingRequest = null,
  currentlyRenderingKeyPath = null,
  firstWorkInProgressHook = null,
  workInProgressHook = null,
  isReRender = !1,
  didScheduleRenderPhaseUpdate = !1,
  localIdCounter = 0,
  actionStateCounter = 0,
  actionStateMatchingIndex = -1,
  thenableIndexCounter = 0,
  thenableState = null,
  renderPhaseUpdates = null,
  numberOfReRenders = 0;
function resolveCurrentlyRenderingComponent() {
  if (null === currentlyRenderingComponent)
    throw Error(formatProdErrorMessage(321));
  return currentlyRenderingComponent;
}
function createHook() {
  if (0 < numberOfReRenders) throw Error(formatProdErrorMessage(312));
  return { memoizedState: null, queue: null, next: null };
}
function createWorkInProgressHook() {
  null === workInProgressHook
    ? null === firstWorkInProgressHook
      ? ((isReRender = !1),
        (firstWorkInProgressHook = workInProgressHook = createHook()))
      : ((isReRender = !0), (workInProgressHook = firstWorkInProgressHook))
    : null === workInProgressHook.next
      ? ((isReRender = !1),
        (workInProgressHook = workInProgressHook.next = createHook()))
      : ((isReRender = !0), (workInProgressHook = workInProgressHook.next));
  return workInProgressHook;
}
function getThenableStateAfterSuspending() {
  var state = thenableState;
  thenableState = null;
  return state;
}
function resetHooksState() {
  currentlyRenderingKeyPath =
    currentlyRenderingRequest =
    currentlyRenderingTask =
    currentlyRenderingComponent =
      null;
  didScheduleRenderPhaseUpdate = !1;
  firstWorkInProgressHook = null;
  numberOfReRenders = 0;
  workInProgressHook = renderPhaseUpdates = null;
}
function basicStateReducer(state, action) {
  return "function" === typeof action ? action(state) : action;
}
function useReducer(reducer, initialArg, init) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  if (isReRender) {
    var queue = workInProgressHook.queue;
    initialArg = queue.dispatch;
    if (
      null !== renderPhaseUpdates &&
      ((init = renderPhaseUpdates.get(queue)), void 0 !== init)
    ) {
      renderPhaseUpdates.delete(queue);
      queue = workInProgressHook.memoizedState;
      do (queue = reducer(queue, init.action)), (init = init.next);
      while (null !== init);
      workInProgressHook.memoizedState = queue;
      return [queue, initialArg];
    }
    return [workInProgressHook.memoizedState, initialArg];
  }
  reducer =
    reducer === basicStateReducer
      ? "function" === typeof initialArg
        ? initialArg()
        : initialArg
      : void 0 !== init
        ? init(initialArg)
        : initialArg;
  workInProgressHook.memoizedState = reducer;
  reducer = workInProgressHook.queue = { last: null, dispatch: null };
  reducer = reducer.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingComponent,
    reducer
  );
  return [workInProgressHook.memoizedState, reducer];
}
function useMemo(nextCreate, deps) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  if (null !== workInProgressHook) {
    var prevState = workInProgressHook.memoizedState;
    if (null !== prevState && null !== deps) {
      var prevDeps = prevState[1];
      a: if (null === prevDeps) prevDeps = !1;
      else {
        for (var i = 0; i < prevDeps.length && i < deps.length; i++)
          if (!objectIs(deps[i], prevDeps[i])) {
            prevDeps = !1;
            break a;
          }
        prevDeps = !0;
      }
      if (prevDeps) return prevState[0];
    }
  }
  nextCreate = nextCreate();
  workInProgressHook.memoizedState = [nextCreate, deps];
  return nextCreate;
}
function dispatchAction(componentIdentity, queue, action) {
  if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
  if (componentIdentity === currentlyRenderingComponent)
    if (
      ((didScheduleRenderPhaseUpdate = !0),
      (componentIdentity = { action: action, next: null }),
      null === renderPhaseUpdates && (renderPhaseUpdates = new Map()),
      (action = renderPhaseUpdates.get(queue)),
      void 0 === action)
    )
      renderPhaseUpdates.set(queue, componentIdentity);
    else {
      for (queue = action; null !== queue.next; ) queue = queue.next;
      queue.next = componentIdentity;
    }
}
function throwOnUseEffectEventCall() {
  throw Error(formatProdErrorMessage(440));
}
function unsupportedStartTransition() {
  throw Error(formatProdErrorMessage(394));
}
function unsupportedSetOptimisticState() {
  throw Error(formatProdErrorMessage(479));
}
function useActionState(action, initialState, permalink) {
  resolveCurrentlyRenderingComponent();
  var actionStateHookIndex = actionStateCounter++,
    request = currentlyRenderingRequest;
  if ("function" === typeof action.$$FORM_ACTION) {
    var nextPostbackStateKey = null,
      componentKeyPath = currentlyRenderingKeyPath;
    request = request.formState;
    var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
    if (null !== request && "function" === typeof isSignatureEqual) {
      var postbackKey = request[1];
      isSignatureEqual.call(action, request[2], request[3]) &&
        ((nextPostbackStateKey =
          void 0 !== permalink
            ? "p" + permalink
            : "k" +
              murmurhash3_32_gc(
                JSON.stringify([componentKeyPath, null, actionStateHookIndex]),
                0
              )),
        postbackKey === nextPostbackStateKey &&
          ((actionStateMatchingIndex = actionStateHookIndex),
          (initialState = request[0])));
    }
    var boundAction = action.bind(null, initialState);
    action = function (payload) {
      boundAction(payload);
    };
    "function" === typeof boundAction.$$FORM_ACTION &&
      (action.$$FORM_ACTION = function (prefix) {
        prefix = boundAction.$$FORM_ACTION(prefix);
        void 0 !== permalink &&
          ((permalink += ""), (prefix.action = permalink));
        var formData = prefix.data;
        formData &&
          (null === nextPostbackStateKey &&
            (nextPostbackStateKey =
              void 0 !== permalink
                ? "p" + permalink
                : "k" +
                  murmurhash3_32_gc(
                    JSON.stringify([
                      componentKeyPath,
                      null,
                      actionStateHookIndex
                    ]),
                    0
                  )),
          formData.append("$ACTION_KEY", nextPostbackStateKey));
        return prefix;
      });
    return [initialState, action, !1];
  }
  var boundAction$22 = action.bind(null, initialState);
  return [
    initialState,
    function (payload) {
      boundAction$22(payload);
    },
    !1
  ];
}
function unwrapThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  return trackUsedThenable(thenableState, thenable, index);
}
function unsupportedRefresh() {
  throw Error(formatProdErrorMessage(393));
}
var HooksDispatcher = {
    readContext: function (context) {
      return context._currentValue2;
    },
    use: function (usable) {
      if (null !== usable && "object" === typeof usable) {
        if ("function" === typeof usable.then) return unwrapThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE)
          return usable._currentValue2;
      }
      throw Error(formatProdErrorMessage(438, String(usable)));
    },
    useContext: function (context) {
      resolveCurrentlyRenderingComponent();
      return context._currentValue2;
    },
    useMemo: useMemo,
    useReducer: useReducer,
    useRef: function (initialValue) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      var previousRef = workInProgressHook.memoizedState;
      return null === previousRef
        ? ((initialValue = { current: initialValue }),
          (workInProgressHook.memoizedState = initialValue))
        : previousRef;
    },
    useState: function (initialState) {
      return useReducer(basicStateReducer, initialState);
    },
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useCallback: function (callback, deps) {
      return useMemo(function () {
        return callback;
      }, deps);
    },
    useImperativeHandle: noop,
    useEffect: noop,
    useDebugValue: noop,
    useDeferredValue: function (value, initialValue) {
      resolveCurrentlyRenderingComponent();
      return void 0 !== initialValue ? initialValue : value;
    },
    useTransition: function () {
      resolveCurrentlyRenderingComponent();
      return [!1, unsupportedStartTransition];
    },
    useId: function () {
      var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
      var overflow = JSCompiler_inline_result.overflow;
      JSCompiler_inline_result = JSCompiler_inline_result.id;
      JSCompiler_inline_result =
        (
          JSCompiler_inline_result &
          ~(1 << (32 - clz32(JSCompiler_inline_result) - 1))
        ).toString(32) + overflow;
      var resumableState = currentResumableState;
      if (null === resumableState) throw Error(formatProdErrorMessage(404));
      overflow = localIdCounter++;
      JSCompiler_inline_result =
        "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
      0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
      return JSCompiler_inline_result + "_";
    },
    useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
      if (void 0 === getServerSnapshot)
        throw Error(formatProdErrorMessage(407));
      return getServerSnapshot();
    },
    useOptimistic: function (passthrough) {
      resolveCurrentlyRenderingComponent();
      return [passthrough, unsupportedSetOptimisticState];
    },
    useActionState: useActionState,
    useFormState: useActionState,
    useHostTransitionStatus: function () {
      resolveCurrentlyRenderingComponent();
      return sharedNotPendingObject;
    },
    useMemoCache: function (size) {
      for (var data = Array(size), i = 0; i < size; i++)
        data[i] = REACT_MEMO_CACHE_SENTINEL;
      return data;
    },
    useCacheRefresh: function () {
      return unsupportedRefresh;
    },
    useEffectEvent: function () {
      return throwOnUseEffectEventCall;
    }
  },
  currentResumableState = null,
  DefaultAsyncDispatcher = {
    getCacheForType: function () {
      throw Error(formatProdErrorMessage(248));
    },
    cacheSignal: function () {
      throw Error(formatProdErrorMessage(248));
    }
  },
  prefix,
  suffix;
function describeBuiltInComponentFrame(name) {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn, construct) {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$24) {
                control = x$24;
              }
              fn.call(Fake.prototype);
            }
          } else {
            try {
              throw Error();
            } catch (x$25) {
              control = x$25;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame].replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace)
    : "";
}
function describeComponentStackByType(type) {
  if ("string" === typeof type) return describeBuiltInComponentFrame(type);
  if ("function" === typeof type)
    return type.prototype && type.prototype.isReactComponent
      ? describeNativeComponentFrame(type, !0)
      : describeNativeComponentFrame(type, !1);
  if ("object" === typeof type && null !== type) {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeNativeComponentFrame(type.render, !1);
      case REACT_MEMO_TYPE:
        return describeNativeComponentFrame(type.type, !1);
      case REACT_LAZY_TYPE:
        var lazyComponent = type,
          payload = lazyComponent._payload;
        lazyComponent = lazyComponent._init;
        try {
          type = lazyComponent(payload);
        } catch (x) {
          return describeBuiltInComponentFrame("Lazy");
        }
        return describeComponentStackByType(type);
    }
    if ("string" === typeof type.name) {
      a: {
        payload = type.name;
        lazyComponent = type.env;
        var location = type.debugLocation;
        if (
          null != location &&
          ((type = Error.prepareStackTrace),
          (Error.prepareStackTrace = void 0),
          (location = location.stack),
          (Error.prepareStackTrace = type),
          location.startsWith("Error: react-stack-top-frame\n") &&
            (location = location.slice(29)),
          (type = location.indexOf("\n")),
          -1 !== type && (location = location.slice(type + 1)),
          (type = location.indexOf("react_stack_bottom_frame")),
          -1 !== type && (type = location.lastIndexOf("\n", type)),
          (type = -1 !== type ? (location = location.slice(0, type)) : ""),
          (location = type.lastIndexOf("\n")),
          (type = -1 === location ? type : type.slice(location + 1)),
          -1 !== type.indexOf(payload))
        ) {
          payload = "\n" + type;
          break a;
        }
        payload = describeBuiltInComponentFrame(
          payload + (lazyComponent ? " [" + lazyComponent + "]" : "")
        );
      }
      return payload;
    }
  }
  switch (type) {
    case REACT_SUSPENSE_LIST_TYPE:
      return describeBuiltInComponentFrame("SuspenseList");
    case REACT_SUSPENSE_TYPE:
      return describeBuiltInComponentFrame("Suspense");
  }
  return "";
}
function isEligibleForOutlining(request, boundary) {
  return (500 < boundary.byteSize || !1) && null === boundary.contentPreamble;
}
function defaultErrorHandler(error) {
  if (
    "object" === typeof error &&
    null !== error &&
    "string" === typeof error.environmentName
  ) {
    var JSCompiler_inline_result = error.environmentName;
    error = [error].slice(0);
    "string" === typeof error[0]
      ? error.splice(
          0,
          1,
          "[%s] " + error[0],
          " " + JSCompiler_inline_result + " "
        )
      : error.splice(0, 0, "[%s]", " " + JSCompiler_inline_result + " ");
    error.unshift(console);
    JSCompiler_inline_result = bind.apply(console.error, error);
    JSCompiler_inline_result();
  } else console.error(error);
  return null;
}
function RequestInstance(
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone,
  formState
) {
  var abortSet = new Set();
  this.destination = null;
  this.flushScheduled = !1;
  this.resumableState = resumableState;
  this.renderState = renderState;
  this.rootFormatContext = rootFormatContext;
  this.progressiveChunkSize =
    void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
  this.status = 10;
  this.fatalError = null;
  this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
  this.completedPreambleSegments = this.completedRootSegment = null;
  this.byteSize = 0;
  this.abortableTasks = abortSet;
  this.pingedTasks = [];
  this.clientRenderedBoundaries = [];
  this.completedBoundaries = [];
  this.partialBoundaries = [];
  this.trackedPostpones = null;
  this.onError = void 0 === onError ? defaultErrorHandler : onError;
  this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
  this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
  this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
  this.onShellError = void 0 === onShellError ? noop : onShellError;
  this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
  this.formState = void 0 === formState ? null : formState;
}
function createRequest(
  children,
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone,
  formState
) {
  resumableState = new RequestInstance(
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    onPostpone,
    formState
  );
  renderState = createPendingSegment(
    resumableState,
    0,
    null,
    rootFormatContext,
    !1,
    !1
  );
  renderState.parentFlushed = !0;
  children = createRenderTask(
    resumableState,
    null,
    children,
    -1,
    null,
    renderState,
    null,
    null,
    resumableState.abortableTasks,
    null,
    rootFormatContext,
    null,
    emptyTreeContext,
    null,
    null
  );
  pushComponentStack(children);
  resumableState.pingedTasks.push(children);
  return resumableState;
}
var currentRequest = null;
function pingTask(request, task) {
  request.pingedTasks.push(task);
  1 === request.pingedTasks.length &&
    ((request.flushScheduled = null !== request.destination),
    performWork(request));
}
function createSuspenseBoundary(
  request,
  row,
  fallbackAbortableTasks,
  contentPreamble,
  fallbackPreamble
) {
  fallbackAbortableTasks = {
    status: 0,
    rootSegmentID: -1,
    parentFlushed: !1,
    pendingTasks: 0,
    row: row,
    completedSegments: [],
    byteSize: 0,
    fallbackAbortableTasks: fallbackAbortableTasks,
    errorDigest: null,
    contentState: createHoistableState(),
    fallbackState: createHoistableState(),
    contentPreamble: contentPreamble,
    fallbackPreamble: fallbackPreamble,
    trackedContentKeyPath: null,
    trackedFallbackNode: null
  };
  null !== row &&
    (row.pendingTasks++,
    (contentPreamble = row.boundaries),
    null !== contentPreamble &&
      (request.allPendingTasks++,
      fallbackAbortableTasks.pendingTasks++,
      contentPreamble.push(fallbackAbortableTasks)),
    (request = row.inheritedHoistables),
    null !== request &&
      hoistHoistables(fallbackAbortableTasks.contentState, request));
  return fallbackAbortableTasks;
}
function createRenderTask(
  request,
  thenableState,
  node,
  childIndex,
  blockedBoundary,
  blockedSegment,
  blockedPreamble,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  var task = {
    replay: null,
    node: node,
    childIndex: childIndex,
    ping: function () {
      return pingTask(request, task);
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: blockedSegment,
    blockedPreamble: blockedPreamble,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  abortSet.add(task);
  return task;
}
function createReplayTask(
  request,
  thenableState,
  replay,
  node,
  childIndex,
  blockedBoundary,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  replay.pendingTasks++;
  var task = {
    replay: replay,
    node: node,
    childIndex: childIndex,
    ping: function () {
      return pingTask(request, task);
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: null,
    blockedPreamble: null,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  abortSet.add(task);
  return task;
}
function createPendingSegment(
  request,
  index,
  boundary,
  parentFormatContext,
  lastPushedText,
  textEmbedded
) {
  return {
    status: 0,
    parentFlushed: !1,
    id: -1,
    index: index,
    chunks: [],
    children: [],
    preambleChildren: [],
    parentFormatContext: parentFormatContext,
    boundary: boundary,
    lastPushedText: lastPushedText,
    textEmbedded: textEmbedded
  };
}
function pushComponentStack(task) {
  var node = task.node;
  if ("object" === typeof node && null !== node)
    switch (node.$$typeof) {
      case REACT_ELEMENT_TYPE:
        task.componentStack = { parent: task.componentStack, type: node.type };
    }
}
function replaceSuspenseComponentStackWithSuspenseFallbackStack(
  componentStack
) {
  return null === componentStack
    ? null
    : { parent: componentStack.parent, type: "Suspense Fallback" };
}
function getThrownInfo(node$jscomp$0) {
  var errorInfo = {};
  node$jscomp$0 &&
    Object.defineProperty(errorInfo, "componentStack", {
      configurable: !0,
      enumerable: !0,
      get: function () {
        try {
          var info = "",
            node = node$jscomp$0;
          do
            (info += describeComponentStackByType(node.type)),
              (node = node.parent);
          while (node);
          var JSCompiler_inline_result = info;
        } catch (x) {
          JSCompiler_inline_result =
            "\nError generating stack: " + x.message + "\n" + x.stack;
        }
        Object.defineProperty(errorInfo, "componentStack", {
          value: JSCompiler_inline_result
        });
        return JSCompiler_inline_result;
      }
    });
  return errorInfo;
}
function logRecoverableError(request, error, errorInfo) {
  request = request.onError;
  error = request(error, errorInfo);
  if (null == error || "string" === typeof error) return error;
}
function fatalError(request, error) {
  var onShellError = request.onShellError,
    onFatalError = request.onFatalError;
  onShellError(error);
  onFatalError(error);
  null !== request.destination
    ? ((request.status = 14), request.destination.destroy(error))
    : ((request.status = 13), (request.fatalError = error));
}
function finishSuspenseListRow(request, row) {
  unblockSuspenseListRow(request, row.next, row.hoistables);
}
function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
  for (; null !== unblockedRow; ) {
    null !== inheritedHoistables &&
      (hoistHoistables(unblockedRow.hoistables, inheritedHoistables),
      (unblockedRow.inheritedHoistables = inheritedHoistables));
    var unblockedBoundaries = unblockedRow.boundaries;
    if (null !== unblockedBoundaries) {
      unblockedRow.boundaries = null;
      for (var i = 0; i < unblockedBoundaries.length; i++) {
        var unblockedBoundary = unblockedBoundaries[i];
        null !== inheritedHoistables &&
          hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
        finishedTask(request, unblockedBoundary, null, null);
      }
    }
    unblockedRow.pendingTasks--;
    if (0 < unblockedRow.pendingTasks) break;
    inheritedHoistables = unblockedRow.hoistables;
    unblockedRow = unblockedRow.next;
  }
}
function tryToResolveTogetherRow(request, togetherRow) {
  var boundaries = togetherRow.boundaries;
  if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
    for (var allCompleteAndInlinable = !0, i = 0; i < boundaries.length; i++) {
      var rowBoundary = boundaries[i];
      if (
        1 !== rowBoundary.pendingTasks ||
        rowBoundary.parentFlushed ||
        isEligibleForOutlining(request, rowBoundary)
      ) {
        allCompleteAndInlinable = !1;
        break;
      }
    }
    allCompleteAndInlinable &&
      unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
  }
}
function createSuspenseListRow(previousRow) {
  var newRow = {
    pendingTasks: 1,
    boundaries: null,
    hoistables: createHoistableState(),
    inheritedHoistables: null,
    together: !1,
    next: null
  };
  null !== previousRow &&
    0 < previousRow.pendingTasks &&
    (newRow.pendingTasks++,
    (newRow.boundaries = []),
    (previousRow.next = newRow));
  return newRow;
}
function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
  var prevKeyPath = task.keyPath,
    prevTreeContext = task.treeContext,
    prevRow = task.row;
  task.keyPath = keyPath;
  keyPath = rows.length;
  var previousSuspenseListRow = null;
  if (null !== task.replay) {
    var resumeSlots = task.replay.slots;
    if (null !== resumeSlots && "object" === typeof resumeSlots)
      for (var n = 0; n < keyPath; n++) {
        var i =
            "backwards" !== revealOrder &&
            "unstable_legacy-backwards" !== revealOrder
              ? n
              : keyPath - 1 - n,
          node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow
        );
        task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
        var resumeSegmentID = resumeSlots[i];
        "number" === typeof resumeSegmentID
          ? (resumeNode(request, task, resumeSegmentID, node, i),
            delete resumeSlots[i])
          : renderNode(request, task, node, i);
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
      }
    else
      for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++)
        (n =
          "backwards" !== revealOrder &&
          "unstable_legacy-backwards" !== revealOrder
            ? resumeSlots
            : keyPath - 1 - resumeSlots),
          (i = rows[n]),
          (task.row = previousSuspenseListRow =
            createSuspenseListRow(previousSuspenseListRow)),
          (task.treeContext = pushTreeContext(prevTreeContext, keyPath, n)),
          renderNode(request, task, i, n),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
  } else if (
    "backwards" !== revealOrder &&
    "unstable_legacy-backwards" !== revealOrder
  )
    for (revealOrder = 0; revealOrder < keyPath; revealOrder++)
      (resumeSlots = rows[revealOrder]),
        (task.row = previousSuspenseListRow =
          createSuspenseListRow(previousSuspenseListRow)),
        (task.treeContext = pushTreeContext(
          prevTreeContext,
          keyPath,
          revealOrder
        )),
        renderNode(request, task, resumeSlots, revealOrder),
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
  else {
    revealOrder = task.blockedSegment;
    resumeSlots = revealOrder.children.length;
    n = revealOrder.chunks.length;
    for (i = keyPath - 1; 0 <= i; i--) {
      node = rows[i];
      task.row = previousSuspenseListRow = createSuspenseListRow(
        previousSuspenseListRow
      );
      task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
      resumeSegmentID = createPendingSegment(
        request,
        n,
        null,
        task.formatContext,
        0 === i ? revealOrder.lastPushedText : !0,
        !0
      );
      revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
      task.blockedSegment = resumeSegmentID;
      try {
        renderNode(request, task, node, i),
          pushSegmentFinale(
            resumeSegmentID.chunks,
            request.renderState,
            resumeSegmentID.lastPushedText,
            resumeSegmentID.textEmbedded
          ),
          (resumeSegmentID.status = 1),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
      } catch (thrownValue) {
        throw (
          ((resumeSegmentID.status = 12 === request.status ? 3 : 4),
          thrownValue)
        );
      }
    }
    task.blockedSegment = revealOrder;
    revealOrder.lastPushedText = !1;
  }
  null !== prevRow &&
    null !== previousSuspenseListRow &&
    0 < previousSuspenseListRow.pendingTasks &&
    (prevRow.pendingTasks++, (previousSuspenseListRow.next = prevRow));
  task.treeContext = prevTreeContext;
  task.row = prevRow;
  task.keyPath = prevKeyPath;
}
function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  currentlyRenderingComponent = {};
  currentlyRenderingTask = task;
  currentlyRenderingRequest = request;
  currentlyRenderingKeyPath = keyPath;
  actionStateCounter = localIdCounter = 0;
  actionStateMatchingIndex = -1;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate; )
    (didScheduleRenderPhaseUpdate = !1),
      (actionStateCounter = localIdCounter = 0),
      (actionStateMatchingIndex = -1),
      (thenableIndexCounter = 0),
      (numberOfReRenders += 1),
      (workInProgressHook = null),
      (request = Component(props, secondArg));
  resetHooksState();
  return request;
}
function finishFunctionComponent(
  request,
  task,
  keyPath,
  children,
  hasId,
  actionStateCount,
  actionStateMatchingIndex
) {
  var didEmitActionStateMarkers = !1;
  if (0 !== actionStateCount && null !== request.formState) {
    var segment = task.blockedSegment;
    if (null !== segment) {
      didEmitActionStateMarkers = !0;
      segment = segment.chunks;
      for (var i = 0; i < actionStateCount; i++)
        i === actionStateMatchingIndex
          ? segment.push("\x3c!--F!--\x3e")
          : segment.push("\x3c!--F--\x3e");
    }
  }
  actionStateCount = task.keyPath;
  task.keyPath = keyPath;
  hasId
    ? ((keyPath = task.treeContext),
      (task.treeContext = pushTreeContext(keyPath, 1, 0)),
      renderNode(request, task, children, -1),
      (task.treeContext = keyPath))
    : didEmitActionStateMarkers
      ? renderNode(request, task, children, -1)
      : renderNodeDestructive(request, task, children, -1);
  task.keyPath = actionStateCount;
}
function renderElement(request, task, keyPath, type, props, ref) {
  if ("function" === typeof type)
    if (type.prototype && type.prototype.isReactComponent) {
      var newProps = props;
      if ("ref" in props) {
        newProps = {};
        for (var propName in props)
          "ref" !== propName && (newProps[propName] = props[propName]);
      }
      var defaultProps = type.defaultProps;
      if (defaultProps) {
        newProps === props && (newProps = assign({}, newProps, props));
        for (var propName$43 in defaultProps)
          void 0 === newProps[propName$43] &&
            (newProps[propName$43] = defaultProps[propName$43]);
      }
      props = newProps;
      newProps = emptyContextObject;
      defaultProps = type.contextType;
      "object" === typeof defaultProps &&
        null !== defaultProps &&
        (newProps = defaultProps._currentValue2);
      newProps = new type(props, newProps);
      var initialState = void 0 !== newProps.state ? newProps.state : null;
      newProps.updater = classComponentUpdater;
      newProps.props = props;
      newProps.state = initialState;
      defaultProps = { queue: [], replace: !1 };
      newProps._reactInternals = defaultProps;
      ref = type.contextType;
      newProps.context =
        "object" === typeof ref && null !== ref
          ? ref._currentValue2
          : emptyContextObject;
      ref = type.getDerivedStateFromProps;
      "function" === typeof ref &&
        ((ref = ref(props, initialState)),
        (initialState =
          null === ref || void 0 === ref
            ? initialState
            : assign({}, initialState, ref)),
        (newProps.state = initialState));
      if (
        "function" !== typeof type.getDerivedStateFromProps &&
        "function" !== typeof newProps.getSnapshotBeforeUpdate &&
        ("function" === typeof newProps.UNSAFE_componentWillMount ||
          "function" === typeof newProps.componentWillMount)
      )
        if (
          ((type = newProps.state),
          "function" === typeof newProps.componentWillMount &&
            newProps.componentWillMount(),
          "function" === typeof newProps.UNSAFE_componentWillMount &&
            newProps.UNSAFE_componentWillMount(),
          type !== newProps.state &&
            classComponentUpdater.enqueueReplaceState(
              newProps,
              newProps.state,
              null
            ),
          null !== defaultProps.queue && 0 < defaultProps.queue.length)
        )
          if (
            ((type = defaultProps.queue),
            (ref = defaultProps.replace),
            (defaultProps.queue = null),
            (defaultProps.replace = !1),
            ref && 1 === type.length)
          )
            newProps.state = type[0];
          else {
            defaultProps = ref ? type[0] : newProps.state;
            initialState = !0;
            for (ref = ref ? 1 : 0; ref < type.length; ref++)
              (propName$43 = type[ref]),
                (propName$43 =
                  "function" === typeof propName$43
                    ? propName$43.call(newProps, defaultProps, props, void 0)
                    : propName$43),
                null != propName$43 &&
                  (initialState
                    ? ((initialState = !1),
                      (defaultProps = assign({}, defaultProps, propName$43)))
                    : assign(defaultProps, propName$43));
            newProps.state = defaultProps;
          }
        else defaultProps.queue = null;
      type = newProps.render();
      if (12 === request.status) throw null;
      props = task.keyPath;
      task.keyPath = keyPath;
      renderNodeDestructive(request, task, type, -1);
      task.keyPath = props;
    } else {
      type = renderWithHooks(request, task, keyPath, type, props, void 0);
      if (12 === request.status) throw null;
      finishFunctionComponent(
        request,
        task,
        keyPath,
        type,
        0 !== localIdCounter,
        actionStateCounter,
        actionStateMatchingIndex
      );
    }
  else if ("string" === typeof type)
    if (((newProps = task.blockedSegment), null === newProps))
      (newProps = props.children),
        (defaultProps = task.formatContext),
        (initialState = task.keyPath),
        (task.formatContext = getChildFormatContext(defaultProps, type, props)),
        (task.keyPath = keyPath),
        renderNode(request, task, newProps, -1),
        (task.formatContext = defaultProps),
        (task.keyPath = initialState);
    else {
      initialState = pushStartInstance(
        newProps.chunks,
        type,
        props,
        request.resumableState,
        request.renderState,
        task.blockedPreamble,
        task.hoistableState,
        task.formatContext,
        newProps.lastPushedText
      );
      newProps.lastPushedText = !1;
      defaultProps = task.formatContext;
      ref = task.keyPath;
      task.keyPath = keyPath;
      if (
        3 ===
        (task.formatContext = getChildFormatContext(defaultProps, type, props))
          .insertionMode
      ) {
        keyPath = createPendingSegment(
          request,
          0,
          null,
          task.formatContext,
          !1,
          !1
        );
        newProps.preambleChildren.push(keyPath);
        task.blockedSegment = keyPath;
        try {
          (keyPath.status = 6),
            renderNode(request, task, initialState, -1),
            pushSegmentFinale(
              keyPath.chunks,
              request.renderState,
              keyPath.lastPushedText,
              keyPath.textEmbedded
            ),
            (keyPath.status = 1);
        } finally {
          task.blockedSegment = newProps;
        }
      } else renderNode(request, task, initialState, -1);
      task.formatContext = defaultProps;
      task.keyPath = ref;
      a: {
        task = newProps.chunks;
        request = request.resumableState;
        switch (type) {
          case "title":
          case "style":
          case "script":
          case "area":
          case "base":
          case "br":
          case "col":
          case "embed":
          case "hr":
          case "img":
          case "input":
          case "keygen":
          case "link":
          case "meta":
          case "param":
          case "source":
          case "track":
          case "wbr":
            break a;
          case "body":
            if (1 >= defaultProps.insertionMode) {
              request.hasBody = !0;
              break a;
            }
            break;
          case "html":
            if (0 === defaultProps.insertionMode) {
              request.hasHtml = !0;
              break a;
            }
            break;
          case "head":
            if (1 >= defaultProps.insertionMode) break a;
        }
        task.push(endChunkForTag(type));
      }
      newProps.lastPushedText = !1;
    }
  else {
    switch (type) {
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_STRICT_MODE_TYPE:
      case REACT_PROFILER_TYPE:
      case REACT_FRAGMENT_TYPE:
        type = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, props.children, -1);
        task.keyPath = type;
        return;
      case REACT_ACTIVITY_TYPE:
        type = task.blockedSegment;
        null === type
          ? "hidden" !== props.mode &&
            ((type = task.keyPath),
            (task.keyPath = keyPath),
            renderNode(request, task, props.children, -1),
            (task.keyPath = type))
          : "hidden" !== props.mode &&
            (request.renderState.generateStaticMarkup ||
              type.chunks.push("\x3c!--&--\x3e"),
            (type.lastPushedText = !1),
            (newProps = task.keyPath),
            (task.keyPath = keyPath),
            renderNode(request, task, props.children, -1),
            (task.keyPath = newProps),
            request.renderState.generateStaticMarkup ||
              type.chunks.push("\x3c!--/&--\x3e"),
            (type.lastPushedText = !1));
        return;
      case REACT_SUSPENSE_LIST_TYPE:
        a: {
          type = props.children;
          props = props.revealOrder;
          if (
            "forwards" === props ||
            "backwards" === props ||
            "unstable_legacy-backwards" === props
          ) {
            if (isArrayImpl(type)) {
              renderSuspenseListRows(request, task, keyPath, type, props);
              break a;
            }
            if ((newProps = getIteratorFn(type)))
              if ((newProps = newProps.call(type))) {
                defaultProps = newProps.next();
                if (!defaultProps.done) {
                  do defaultProps = newProps.next();
                  while (!defaultProps.done);
                  renderSuspenseListRows(request, task, keyPath, type, props);
                }
                break a;
              }
          }
          "together" === props
            ? ((props = task.keyPath),
              (newProps = task.row),
              (defaultProps = task.row = createSuspenseListRow(null)),
              (defaultProps.boundaries = []),
              (defaultProps.together = !0),
              (task.keyPath = keyPath),
              renderNodeDestructive(request, task, type, -1),
              0 === --defaultProps.pendingTasks &&
                finishSuspenseListRow(request, defaultProps),
              (task.keyPath = props),
              (task.row = newProps),
              null !== newProps &&
                0 < defaultProps.pendingTasks &&
                (newProps.pendingTasks++, (defaultProps.next = newProps)))
            : ((props = task.keyPath),
              (task.keyPath = keyPath),
              renderNodeDestructive(request, task, type, -1),
              (task.keyPath = props));
        }
        return;
      case REACT_VIEW_TRANSITION_TYPE:
      case REACT_SCOPE_TYPE:
        throw Error(formatProdErrorMessage(343));
      case REACT_SUSPENSE_TYPE:
        a: if (null !== task.replay) {
          type = task.keyPath;
          newProps = task.formatContext;
          defaultProps = task.row;
          task.keyPath = keyPath;
          task.formatContext = getSuspenseContentFormatContext(
            request.resumableState,
            newProps
          );
          task.row = null;
          keyPath = props.children;
          try {
            renderNode(request, task, keyPath, -1);
          } finally {
            (task.keyPath = type),
              (task.formatContext = newProps),
              (task.row = defaultProps);
          }
        } else {
          type = task.keyPath;
          ref = task.formatContext;
          var prevRow = task.row,
            parentBoundary = task.blockedBoundary;
          propName$43 = task.blockedPreamble;
          var parentHoistableState = task.hoistableState;
          propName = task.blockedSegment;
          var fallback = props.fallback;
          props = props.children;
          var fallbackAbortSet = new Set();
          var newBoundary = createSuspenseBoundary(
            request,
            task.row,
            fallbackAbortSet,
            null,
            null
          );
          null !== request.trackedPostpones &&
            (newBoundary.trackedContentKeyPath = keyPath);
          var boundarySegment = createPendingSegment(
            request,
            propName.chunks.length,
            newBoundary,
            task.formatContext,
            !1,
            !1
          );
          propName.children.push(boundarySegment);
          propName.lastPushedText = !1;
          var contentRootSegment = createPendingSegment(
            request,
            0,
            null,
            task.formatContext,
            !1,
            !1
          );
          contentRootSegment.parentFlushed = !0;
          if (null !== request.trackedPostpones) {
            newProps = task.componentStack;
            defaultProps = [keyPath[0], "Suspense Fallback", keyPath[2]];
            initialState = [defaultProps[1], defaultProps[2], [], null];
            request.trackedPostpones.workingMap.set(defaultProps, initialState);
            newBoundary.trackedFallbackNode = initialState;
            task.blockedSegment = boundarySegment;
            task.blockedPreamble = newBoundary.fallbackPreamble;
            task.keyPath = defaultProps;
            task.formatContext = getSuspenseFallbackFormatContext(
              request.resumableState,
              ref
            );
            task.componentStack =
              replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
            boundarySegment.status = 6;
            try {
              renderNode(request, task, fallback, -1),
                pushSegmentFinale(
                  boundarySegment.chunks,
                  request.renderState,
                  boundarySegment.lastPushedText,
                  boundarySegment.textEmbedded
                ),
                (boundarySegment.status = 1);
            } catch (thrownValue) {
              throw (
                ((boundarySegment.status = 12 === request.status ? 3 : 4),
                thrownValue)
              );
            } finally {
              (task.blockedSegment = propName),
                (task.blockedPreamble = propName$43),
                (task.keyPath = type),
                (task.formatContext = ref);
            }
            task = createRenderTask(
              request,
              null,
              props,
              -1,
              newBoundary,
              contentRootSegment,
              newBoundary.contentPreamble,
              newBoundary.contentState,
              task.abortSet,
              keyPath,
              getSuspenseContentFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              null,
              newProps
            );
            pushComponentStack(task);
            request.pingedTasks.push(task);
          } else {
            task.blockedBoundary = newBoundary;
            task.blockedPreamble = newBoundary.contentPreamble;
            task.hoistableState = newBoundary.contentState;
            task.blockedSegment = contentRootSegment;
            task.keyPath = keyPath;
            task.formatContext = getSuspenseContentFormatContext(
              request.resumableState,
              ref
            );
            task.row = null;
            contentRootSegment.status = 6;
            try {
              if (
                (renderNode(request, task, props, -1),
                pushSegmentFinale(
                  contentRootSegment.chunks,
                  request.renderState,
                  contentRootSegment.lastPushedText,
                  contentRootSegment.textEmbedded
                ),
                (contentRootSegment.status = 1),
                queueCompletedSegment(newBoundary, contentRootSegment),
                0 === newBoundary.pendingTasks && 0 === newBoundary.status)
              ) {
                if (
                  ((newBoundary.status = 1),
                  !isEligibleForOutlining(request, newBoundary))
                ) {
                  null !== prevRow &&
                    0 === --prevRow.pendingTasks &&
                    finishSuspenseListRow(request, prevRow);
                  0 === request.pendingRootTasks &&
                    task.blockedPreamble &&
                    preparePreamble(request);
                  break a;
                }
              } else
                null !== prevRow &&
                  prevRow.together &&
                  tryToResolveTogetherRow(request, prevRow);
            } catch (thrownValue$30) {
              (newBoundary.status = 4),
                12 === request.status
                  ? ((contentRootSegment.status = 3),
                    (newProps = request.fatalError))
                  : ((contentRootSegment.status = 4),
                    (newProps = thrownValue$30)),
                (defaultProps = getThrownInfo(task.componentStack)),
                (initialState = logRecoverableError(
                  request,
                  newProps,
                  defaultProps
                )),
                (newBoundary.errorDigest = initialState),
                untrackBoundary(request, newBoundary);
            } finally {
              (task.blockedBoundary = parentBoundary),
                (task.blockedPreamble = propName$43),
                (task.hoistableState = parentHoistableState),
                (task.blockedSegment = propName),
                (task.keyPath = type),
                (task.formatContext = ref),
                (task.row = prevRow);
            }
            task = createRenderTask(
              request,
              null,
              fallback,
              -1,
              parentBoundary,
              boundarySegment,
              newBoundary.fallbackPreamble,
              newBoundary.fallbackState,
              fallbackAbortSet,
              [keyPath[0], "Suspense Fallback", keyPath[2]],
              getSuspenseFallbackFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              task.row,
              replaceSuspenseComponentStackWithSuspenseFallbackStack(
                task.componentStack
              )
            );
            pushComponentStack(task);
            request.pingedTasks.push(task);
          }
        }
        return;
    }
    if ("object" === typeof type && null !== type)
      switch (type.$$typeof) {
        case REACT_FORWARD_REF_TYPE:
          if ("ref" in props)
            for (fallback in ((newProps = {}), props))
              "ref" !== fallback && (newProps[fallback] = props[fallback]);
          else newProps = props;
          type = renderWithHooks(
            request,
            task,
            keyPath,
            type.render,
            newProps,
            ref
          );
          finishFunctionComponent(
            request,
            task,
            keyPath,
            type,
            0 !== localIdCounter,
            actionStateCounter,
            actionStateMatchingIndex
          );
          return;
        case REACT_MEMO_TYPE:
          renderElement(request, task, keyPath, type.type, props, ref);
          return;
        case REACT_CONTEXT_TYPE:
          defaultProps = props.children;
          newProps = task.keyPath;
          props = props.value;
          initialState = type._currentValue2;
          type._currentValue2 = props;
          ref = currentActiveSnapshot;
          currentActiveSnapshot = type = {
            parent: ref,
            depth: null === ref ? 0 : ref.depth + 1,
            context: type,
            parentValue: initialState,
            value: props
          };
          task.context = type;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, defaultProps, -1);
          request = currentActiveSnapshot;
          if (null === request) throw Error(formatProdErrorMessage(403));
          request.context._currentValue2 = request.parentValue;
          request = currentActiveSnapshot = request.parent;
          task.context = request;
          task.keyPath = newProps;
          return;
        case REACT_CONSUMER_TYPE:
          props = props.children;
          type = props(type._context._currentValue2);
          props = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, type, -1);
          task.keyPath = props;
          return;
        case REACT_LAZY_TYPE:
          newProps = type._init;
          type = newProps(type._payload);
          if (12 === request.status) throw null;
          renderElement(request, task, keyPath, type, props, ref);
          return;
      }
    throw Error(
      formatProdErrorMessage(130, null == type ? type : typeof type, "")
    );
  }
}
function resumeNode(request, task, segmentId, node, childIndex) {
  var prevReplay = task.replay,
    blockedBoundary = task.blockedBoundary,
    resumedSegment = createPendingSegment(
      request,
      0,
      null,
      task.formatContext,
      !1,
      !1
    );
  resumedSegment.id = segmentId;
  resumedSegment.parentFlushed = !0;
  try {
    (task.replay = null),
      (task.blockedSegment = resumedSegment),
      renderNode(request, task, node, childIndex),
      (resumedSegment.status = 1),
      null === blockedBoundary
        ? (request.completedRootSegment = resumedSegment)
        : (queueCompletedSegment(blockedBoundary, resumedSegment),
          blockedBoundary.parentFlushed &&
            request.partialBoundaries.push(blockedBoundary));
  } finally {
    (task.replay = prevReplay), (task.blockedSegment = null);
  }
}
function renderNodeDestructive(request, task, node, childIndex) {
  null !== task.replay && "number" === typeof task.replay.slots
    ? resumeNode(request, task, task.replay.slots, node, childIndex)
    : ((task.node = node),
      (task.childIndex = childIndex),
      (node = task.componentStack),
      pushComponentStack(task),
      retryNode(request, task),
      (task.componentStack = node));
}
function retryNode(request, task) {
  var node = task.node,
    childIndex = task.childIndex;
  if (null !== node) {
    if ("object" === typeof node) {
      switch (node.$$typeof) {
        case REACT_ELEMENT_TYPE:
          var type = node.type,
            key = node.key,
            props = node.props;
          node = props.ref;
          var ref = void 0 !== node ? node : null,
            name = getComponentNameFromType(type),
            keyOrIndex =
              null == key ? (-1 === childIndex ? 0 : childIndex) : key;
          key = [task.keyPath, name, keyOrIndex];
          if (null !== task.replay)
            a: {
              var replay = task.replay;
              childIndex = replay.nodes;
              for (node = 0; node < childIndex.length; node++) {
                var node$jscomp$0 = childIndex[node];
                if (keyOrIndex === node$jscomp$0[1]) {
                  if (4 === node$jscomp$0.length) {
                    if (null !== name && name !== node$jscomp$0[0])
                      throw Error(
                        formatProdErrorMessage(490, node$jscomp$0[0], name)
                      );
                    var childNodes = node$jscomp$0[2];
                    name = node$jscomp$0[3];
                    keyOrIndex = task.node;
                    task.replay = {
                      nodes: childNodes,
                      slots: name,
                      pendingTasks: 1
                    };
                    try {
                      renderElement(request, task, key, type, props, ref);
                      if (
                        1 === task.replay.pendingTasks &&
                        0 < task.replay.nodes.length
                      )
                        throw Error(formatProdErrorMessage(488));
                      task.replay.pendingTasks--;
                    } catch (x) {
                      if (
                        "object" === typeof x &&
                        null !== x &&
                        (x === SuspenseException ||
                          "function" === typeof x.then)
                      )
                        throw (
                          (task.node === keyOrIndex
                            ? (task.replay = replay)
                            : childIndex.splice(node, 1),
                          x)
                        );
                      task.replay.pendingTasks--;
                      props = getThrownInfo(task.componentStack);
                      key = request;
                      request = task.blockedBoundary;
                      type = x;
                      props = logRecoverableError(key, type, props);
                      abortRemainingReplayNodes(
                        key,
                        request,
                        childNodes,
                        name,
                        type,
                        props
                      );
                    }
                    task.replay = replay;
                  } else {
                    if (type !== REACT_SUSPENSE_TYPE)
                      throw Error(
                        formatProdErrorMessage(
                          490,
                          "Suspense",
                          getComponentNameFromType(type) || "Unknown"
                        )
                      );
                    b: {
                      replay = void 0;
                      type = node$jscomp$0[5];
                      ref = node$jscomp$0[2];
                      name = node$jscomp$0[3];
                      keyOrIndex =
                        null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
                      node$jscomp$0 =
                        null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
                      var prevKeyPath = task.keyPath,
                        prevContext = task.formatContext,
                        prevRow = task.row,
                        previousReplaySet = task.replay,
                        parentBoundary = task.blockedBoundary,
                        parentHoistableState = task.hoistableState,
                        content = props.children,
                        fallback = props.fallback,
                        fallbackAbortSet = new Set();
                      props = createSuspenseBoundary(
                        request,
                        task.row,
                        fallbackAbortSet,
                        null,
                        null
                      );
                      props.parentFlushed = !0;
                      props.rootSegmentID = type;
                      task.blockedBoundary = props;
                      task.hoistableState = props.contentState;
                      task.keyPath = key;
                      task.formatContext = getSuspenseContentFormatContext(
                        request.resumableState,
                        prevContext
                      );
                      task.row = null;
                      task.replay = {
                        nodes: ref,
                        slots: name,
                        pendingTasks: 1
                      };
                      try {
                        renderNode(request, task, content, -1);
                        if (
                          1 === task.replay.pendingTasks &&
                          0 < task.replay.nodes.length
                        )
                          throw Error(formatProdErrorMessage(488));
                        task.replay.pendingTasks--;
                        if (0 === props.pendingTasks && 0 === props.status) {
                          props.status = 1;
                          request.completedBoundaries.push(props);
                          break b;
                        }
                      } catch (error) {
                        (props.status = 4),
                          (childNodes = getThrownInfo(task.componentStack)),
                          (replay = logRecoverableError(
                            request,
                            error,
                            childNodes
                          )),
                          (props.errorDigest = replay),
                          task.replay.pendingTasks--,
                          request.clientRenderedBoundaries.push(props);
                      } finally {
                        (task.blockedBoundary = parentBoundary),
                          (task.hoistableState = parentHoistableState),
                          (task.replay = previousReplaySet),
                          (task.keyPath = prevKeyPath),
                          (task.formatContext = prevContext),
                          (task.row = prevRow);
                      }
                      childNodes = createReplayTask(
                        request,
                        null,
                        {
                          nodes: keyOrIndex,
                          slots: node$jscomp$0,
                          pendingTasks: 0
                        },
                        fallback,
                        -1,
                        parentBoundary,
                        props.fallbackState,
                        fallbackAbortSet,
                        [key[0], "Suspense Fallback", key[2]],
                        getSuspenseFallbackFormatContext(
                          request.resumableState,
                          task.formatContext
                        ),
                        task.context,
                        task.treeContext,
                        task.row,
                        replaceSuspenseComponentStackWithSuspenseFallbackStack(
                          task.componentStack
                        )
                      );
                      pushComponentStack(childNodes);
                      request.pingedTasks.push(childNodes);
                    }
                  }
                  childIndex.splice(node, 1);
                  break a;
                }
              }
            }
          else renderElement(request, task, key, type, props, ref);
          return;
        case REACT_PORTAL_TYPE:
          throw Error(formatProdErrorMessage(257));
        case REACT_LAZY_TYPE:
          childNodes = node._init;
          node = childNodes(node._payload);
          if (12 === request.status) throw null;
          renderNodeDestructive(request, task, node, childIndex);
          return;
      }
      if (isArrayImpl(node)) {
        renderChildrenArray(request, task, node, childIndex);
        return;
      }
      if ((childNodes = getIteratorFn(node)))
        if ((childNodes = childNodes.call(node))) {
          node = childNodes.next();
          if (!node.done) {
            props = [];
            do props.push(node.value), (node = childNodes.next());
            while (!node.done);
            renderChildrenArray(request, task, props, childIndex);
          }
          return;
        }
      if ("function" === typeof node.then)
        return (
          (task.thenableState = null),
          renderNodeDestructive(request, task, unwrapThenable(node), childIndex)
        );
      if (node.$$typeof === REACT_CONTEXT_TYPE)
        return renderNodeDestructive(
          request,
          task,
          node._currentValue2,
          childIndex
        );
      childIndex = Object.prototype.toString.call(node);
      throw Error(
        formatProdErrorMessage(
          31,
          "[object Object]" === childIndex
            ? "object with keys {" + Object.keys(node).join(", ") + "}"
            : childIndex
        )
      );
    }
    if ("string" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            node,
            request.renderState,
            childIndex.lastPushedText
          ));
    else if ("number" === typeof node || "bigint" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            "" + node,
            request.renderState,
            childIndex.lastPushedText
          ));
  }
}
function renderChildrenArray(request, task, children, childIndex) {
  var prevKeyPath = task.keyPath;
  if (
    -1 !== childIndex &&
    ((task.keyPath = [task.keyPath, "Fragment", childIndex]),
    null !== task.replay)
  ) {
    for (
      var replay = task.replay, replayNodes = replay.nodes, j = 0;
      j < replayNodes.length;
      j++
    ) {
      var node = replayNodes[j];
      if (node[1] === childIndex) {
        childIndex = node[2];
        node = node[3];
        task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
        try {
          renderChildrenArray(request, task, children, -1);
          if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
            throw Error(formatProdErrorMessage(488));
          task.replay.pendingTasks--;
        } catch (x) {
          if (
            "object" === typeof x &&
            null !== x &&
            (x === SuspenseException || "function" === typeof x.then)
          )
            throw x;
          task.replay.pendingTasks--;
          children = getThrownInfo(task.componentStack);
          var boundary = task.blockedBoundary,
            error = x;
          children = logRecoverableError(request, error, children);
          abortRemainingReplayNodes(
            request,
            boundary,
            childIndex,
            node,
            error,
            children
          );
        }
        task.replay = replay;
        replayNodes.splice(j, 1);
        break;
      }
    }
    task.keyPath = prevKeyPath;
    return;
  }
  replay = task.treeContext;
  replayNodes = children.length;
  if (
    null !== task.replay &&
    ((j = task.replay.slots), null !== j && "object" === typeof j)
  ) {
    for (childIndex = 0; childIndex < replayNodes; childIndex++)
      (node = children[childIndex]),
        (task.treeContext = pushTreeContext(replay, replayNodes, childIndex)),
        (boundary = j[childIndex]),
        "number" === typeof boundary
          ? (resumeNode(request, task, boundary, node, childIndex),
            delete j[childIndex])
          : renderNode(request, task, node, childIndex);
    task.treeContext = replay;
    task.keyPath = prevKeyPath;
    return;
  }
  for (j = 0; j < replayNodes; j++)
    (childIndex = children[j]),
      (task.treeContext = pushTreeContext(replay, replayNodes, j)),
      renderNode(request, task, childIndex, j);
  task.treeContext = replay;
  task.keyPath = prevKeyPath;
}
function trackPostponedBoundary(request, trackedPostpones, boundary) {
  boundary.status = 5;
  boundary.rootSegmentID = request.nextSegmentId++;
  request = boundary.trackedContentKeyPath;
  if (null === request) throw Error(formatProdErrorMessage(486));
  var fallbackReplayNode = boundary.trackedFallbackNode,
    children = [],
    boundaryNode = trackedPostpones.workingMap.get(request);
  if (void 0 === boundaryNode)
    return (
      (boundary = [
        request[1],
        request[2],
        children,
        null,
        fallbackReplayNode,
        boundary.rootSegmentID
      ]),
      trackedPostpones.workingMap.set(request, boundary),
      addToReplayParent(boundary, request[0], trackedPostpones),
      boundary
    );
  boundaryNode[4] = fallbackReplayNode;
  boundaryNode[5] = boundary.rootSegmentID;
  return boundaryNode;
}
function trackPostpone(request, trackedPostpones, task, segment) {
  segment.status = 5;
  var keyPath = task.keyPath,
    boundary = task.blockedBoundary;
  if (null === boundary)
    (segment.id = request.nextSegmentId++),
      (trackedPostpones.rootSlots = segment.id),
      null !== request.completedRootSegment &&
        (request.completedRootSegment.status = 5);
  else {
    if (null !== boundary && 0 === boundary.status) {
      var boundaryNode = trackPostponedBoundary(
        request,
        trackedPostpones,
        boundary
      );
      if (
        boundary.trackedContentKeyPath === keyPath &&
        -1 === task.childIndex
      ) {
        -1 === segment.id &&
          (segment.id = segment.parentFlushed
            ? boundary.rootSegmentID
            : request.nextSegmentId++);
        boundaryNode[3] = segment.id;
        return;
      }
    }
    -1 === segment.id &&
      (segment.id =
        segment.parentFlushed && null !== boundary
          ? boundary.rootSegmentID
          : request.nextSegmentId++);
    if (-1 === task.childIndex)
      null === keyPath
        ? (trackedPostpones.rootSlots = segment.id)
        : ((task = trackedPostpones.workingMap.get(keyPath)),
          void 0 === task
            ? ((task = [keyPath[1], keyPath[2], [], segment.id]),
              addToReplayParent(task, keyPath[0], trackedPostpones))
            : (task[3] = segment.id));
    else {
      if (null === keyPath)
        if (((request = trackedPostpones.rootSlots), null === request))
          request = trackedPostpones.rootSlots = {};
        else {
          if ("number" === typeof request)
            throw Error(formatProdErrorMessage(491));
        }
      else if (
        ((boundary = trackedPostpones.workingMap),
        (boundaryNode = boundary.get(keyPath)),
        void 0 === boundaryNode)
      )
        (request = {}),
          (boundaryNode = [keyPath[1], keyPath[2], [], request]),
          boundary.set(keyPath, boundaryNode),
          addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
      else if (((request = boundaryNode[3]), null === request))
        request = boundaryNode[3] = {};
      else if ("number" === typeof request)
        throw Error(formatProdErrorMessage(491));
      request[task.childIndex] = segment.id;
    }
  }
}
function untrackBoundary(request, boundary) {
  request = request.trackedPostpones;
  null !== request &&
    ((boundary = boundary.trackedContentKeyPath),
    null !== boundary &&
      ((boundary = request.workingMap.get(boundary)),
      void 0 !== boundary &&
        ((boundary.length = 4), (boundary[2] = []), (boundary[3] = null))));
}
function spawnNewSuspendedReplayTask(request, task, thenableState) {
  return createReplayTask(
    request,
    thenableState,
    task.replay,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack
  );
}
function spawnNewSuspendedRenderTask(request, task, thenableState) {
  var segment = task.blockedSegment,
    newSegment = createPendingSegment(
      request,
      segment.chunks.length,
      null,
      task.formatContext,
      segment.lastPushedText,
      !0
    );
  segment.children.push(newSegment);
  segment.lastPushedText = !1;
  return createRenderTask(
    request,
    thenableState,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    newSegment,
    task.blockedPreamble,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack
  );
}
function renderNode(request, task, node, childIndex) {
  var previousFormatContext = task.formatContext,
    previousContext = task.context,
    previousKeyPath = task.keyPath,
    previousTreeContext = task.treeContext,
    previousComponentStack = task.componentStack,
    segment = task.blockedSegment;
  if (null === segment) {
    segment = task.replay;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue) {
      if (
        (resetHooksState(),
        (node =
          thrownValue === SuspenseException
            ? getSuspendedThenable()
            : thrownValue),
        12 !== request.status && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          childIndex =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
          node.then(request, request);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          node =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          node = spawnNewSuspendedReplayTask(request, task, node);
          request.pingedTasks.push(node);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
      }
    }
  } else {
    var childrenLength = segment.children.length,
      chunkLength = segment.chunks.length;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue$62) {
      if (
        (resetHooksState(),
        (segment.children.length = childrenLength),
        (segment.chunks.length = chunkLength),
        (node =
          thrownValue$62 === SuspenseException
            ? getSuspendedThenable()
            : thrownValue$62),
        12 !== request.status && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          segment = node;
          node =
            thrownValue$62 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedRenderTask(request, task, node).ping;
          segment.then(request, request);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          segment =
            thrownValue$62 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          segment = spawnNewSuspendedRenderTask(request, task, segment);
          request.pingedTasks.push(segment);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
      }
    }
  }
  task.formatContext = previousFormatContext;
  task.context = previousContext;
  task.keyPath = previousKeyPath;
  task.treeContext = previousTreeContext;
  switchContext(previousContext);
  throw node;
}
function abortTaskSoft(task) {
  var boundary = task.blockedBoundary,
    segment = task.blockedSegment;
  null !== segment &&
    ((segment.status = 3), finishedTask(this, boundary, task.row, segment));
}
function abortRemainingReplayNodes(
  request$jscomp$0,
  boundary,
  nodes,
  slots,
  error,
  errorDigest$jscomp$0
) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (4 === node.length)
      abortRemainingReplayNodes(
        request$jscomp$0,
        boundary,
        node[2],
        node[3],
        error,
        errorDigest$jscomp$0
      );
    else {
      node = node[5];
      var request = request$jscomp$0,
        errorDigest = errorDigest$jscomp$0,
        resumedBoundary = createSuspenseBoundary(
          request,
          null,
          new Set(),
          null,
          null
        );
      resumedBoundary.parentFlushed = !0;
      resumedBoundary.rootSegmentID = node;
      resumedBoundary.status = 4;
      resumedBoundary.errorDigest = errorDigest;
      resumedBoundary.parentFlushed &&
        request.clientRenderedBoundaries.push(resumedBoundary);
    }
  }
  nodes.length = 0;
  if (null !== slots) {
    if (null === boundary) throw Error(formatProdErrorMessage(487));
    4 !== boundary.status &&
      ((boundary.status = 4),
      (boundary.errorDigest = errorDigest$jscomp$0),
      boundary.parentFlushed &&
        request$jscomp$0.clientRenderedBoundaries.push(boundary));
    if ("object" === typeof slots) for (var index in slots) delete slots[index];
  }
}
function abortTask(task, request, error) {
  var boundary = task.blockedBoundary,
    segment = task.blockedSegment;
  if (null !== segment) {
    if (6 === segment.status) return;
    segment.status = 3;
  }
  var errorInfo = getThrownInfo(task.componentStack);
  if (null === boundary) {
    if (13 !== request.status && 14 !== request.status) {
      boundary = task.replay;
      if (null === boundary) {
        null !== request.trackedPostpones && null !== segment
          ? ((boundary = request.trackedPostpones),
            logRecoverableError(request, error, errorInfo),
            trackPostpone(request, boundary, task, segment),
            finishedTask(request, null, task.row, segment))
          : (logRecoverableError(request, error, errorInfo),
            fatalError(request, error));
        return;
      }
      boundary.pendingTasks--;
      0 === boundary.pendingTasks &&
        0 < boundary.nodes.length &&
        ((segment = logRecoverableError(request, error, errorInfo)),
        abortRemainingReplayNodes(
          request,
          null,
          boundary.nodes,
          boundary.slots,
          error,
          segment
        ));
      request.pendingRootTasks--;
      0 === request.pendingRootTasks && completeShell(request);
    }
  } else {
    var trackedPostpones$63 = request.trackedPostpones;
    if (4 !== boundary.status) {
      if (null !== trackedPostpones$63 && null !== segment)
        return (
          logRecoverableError(request, error, errorInfo),
          trackPostpone(request, trackedPostpones$63, task, segment),
          boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
            return abortTask(fallbackTask, request, error);
          }),
          boundary.fallbackAbortableTasks.clear(),
          finishedTask(request, boundary, task.row, segment)
        );
      boundary.status = 4;
      segment = logRecoverableError(request, error, errorInfo);
      boundary.status = 4;
      boundary.errorDigest = segment;
      untrackBoundary(request, boundary);
      boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
    }
    boundary.pendingTasks--;
    segment = boundary.row;
    null !== segment &&
      0 === --segment.pendingTasks &&
      finishSuspenseListRow(request, segment);
    boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
      return abortTask(fallbackTask, request, error);
    });
    boundary.fallbackAbortableTasks.clear();
  }
  task = task.row;
  null !== task &&
    0 === --task.pendingTasks &&
    finishSuspenseListRow(request, task);
  request.allPendingTasks--;
  0 === request.allPendingTasks && completeAll(request);
}
function safelyEmitEarlyPreloads(request, shellComplete) {
  try {
    var renderState = request.renderState,
      onHeaders = renderState.onHeaders;
    if (onHeaders) {
      var headers = renderState.headers;
      if (headers) {
        renderState.headers = null;
        var linkHeader = headers.preconnects;
        headers.fontPreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.fontPreloads));
        headers.highImagePreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.highImagePreloads));
        if (!shellComplete) {
          var queueIter = renderState.styles.values(),
            queueStep = queueIter.next();
          b: for (
            ;
            0 < headers.remainingCapacity && !queueStep.done;
            queueStep = queueIter.next()
          )
            for (
              var sheetIter = queueStep.value.sheets.values(),
                sheetStep = sheetIter.next();
              0 < headers.remainingCapacity && !sheetStep.done;
              sheetStep = sheetIter.next()
            ) {
              var sheet = sheetStep.value,
                props = sheet.props,
                key = props.href,
                props$jscomp$0 = sheet.props,
                header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                  crossOrigin: props$jscomp$0.crossOrigin,
                  integrity: props$jscomp$0.integrity,
                  nonce: props$jscomp$0.nonce,
                  type: props$jscomp$0.type,
                  fetchPriority: props$jscomp$0.fetchPriority,
                  referrerPolicy: props$jscomp$0.referrerPolicy,
                  media: props$jscomp$0.media
                });
              if (0 <= (headers.remainingCapacity -= header.length + 2))
                (renderState.resets.style[key] = PRELOAD_NO_CREDS),
                  linkHeader && (linkHeader += ", "),
                  (linkHeader += header),
                  (renderState.resets.style[key] =
                    "string" === typeof props.crossOrigin ||
                    "string" === typeof props.integrity
                      ? [props.crossOrigin, props.integrity]
                      : PRELOAD_NO_CREDS);
              else break b;
            }
        }
        linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
      }
    }
  } catch (error) {
    logRecoverableError(request, error, {});
  }
}
function completeShell(request) {
  null === request.trackedPostpones && safelyEmitEarlyPreloads(request, !0);
  null === request.trackedPostpones && preparePreamble(request);
  request.onShellError = noop;
  request = request.onShellReady;
  request();
}
function completeAll(request) {
  safelyEmitEarlyPreloads(
    request,
    null === request.trackedPostpones
      ? !0
      : null === request.completedRootSegment ||
          5 !== request.completedRootSegment.status
  );
  preparePreamble(request);
  request = request.onAllReady;
  request();
}
function queueCompletedSegment(boundary, segment) {
  if (
    0 === segment.chunks.length &&
    1 === segment.children.length &&
    null === segment.children[0].boundary &&
    -1 === segment.children[0].id
  ) {
    var childSegment = segment.children[0];
    childSegment.id = segment.id;
    childSegment.parentFlushed = !0;
    (1 !== childSegment.status &&
      3 !== childSegment.status &&
      4 !== childSegment.status) ||
      queueCompletedSegment(boundary, childSegment);
  } else boundary.completedSegments.push(segment);
}
function finishedTask(request, boundary, row, segment) {
  null !== row &&
    (0 === --row.pendingTasks
      ? finishSuspenseListRow(request, row)
      : row.together && tryToResolveTogetherRow(request, row));
  request.allPendingTasks--;
  if (null === boundary) {
    if (null !== segment && segment.parentFlushed) {
      if (null !== request.completedRootSegment)
        throw Error(formatProdErrorMessage(389));
      request.completedRootSegment = segment;
    }
    request.pendingRootTasks--;
    0 === request.pendingRootTasks && completeShell(request);
  } else if ((boundary.pendingTasks--, 4 !== boundary.status))
    if (0 === boundary.pendingTasks)
      if (
        (0 === boundary.status && (boundary.status = 1),
        null !== segment &&
          segment.parentFlushed &&
          (1 === segment.status || 3 === segment.status) &&
          queueCompletedSegment(boundary, segment),
        boundary.parentFlushed && request.completedBoundaries.push(boundary),
        1 === boundary.status)
      )
        (row = boundary.row),
          null !== row &&
            hoistHoistables(row.hoistables, boundary.contentState),
          isEligibleForOutlining(request, boundary) ||
            (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request),
            boundary.fallbackAbortableTasks.clear(),
            null !== row &&
              0 === --row.pendingTasks &&
              finishSuspenseListRow(request, row)),
          0 === request.pendingRootTasks &&
            null === request.trackedPostpones &&
            null !== boundary.contentPreamble &&
            preparePreamble(request);
      else {
        if (
          5 === boundary.status &&
          ((boundary = boundary.row), null !== boundary)
        ) {
          if (null !== request.trackedPostpones) {
            row = request.trackedPostpones;
            var postponedRow = boundary.next;
            if (
              null !== postponedRow &&
              ((segment = postponedRow.boundaries), null !== segment)
            )
              for (
                postponedRow.boundaries = null, postponedRow = 0;
                postponedRow < segment.length;
                postponedRow++
              ) {
                var postponedBoundary = segment[postponedRow];
                trackPostponedBoundary(request, row, postponedBoundary);
                finishedTask(request, postponedBoundary, null, null);
              }
          }
          0 === --boundary.pendingTasks &&
            finishSuspenseListRow(request, boundary);
        }
      }
    else
      null === segment ||
        !segment.parentFlushed ||
        (1 !== segment.status && 3 !== segment.status) ||
        (queueCompletedSegment(boundary, segment),
        1 === boundary.completedSegments.length &&
          boundary.parentFlushed &&
          request.partialBoundaries.push(boundary)),
        (boundary = boundary.row),
        null !== boundary &&
          boundary.together &&
          tryToResolveTogetherRow(request, boundary);
  0 === request.allPendingTasks && completeAll(request);
}
function performWork(request$jscomp$2) {
  if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
    var prevContext = currentActiveSnapshot,
      prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = HooksDispatcher;
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    var prevRequest = currentRequest;
    currentRequest = request$jscomp$2;
    var prevResumableState = currentResumableState;
    currentResumableState = request$jscomp$2.resumableState;
    try {
      var pingedTasks = request$jscomp$2.pingedTasks,
        i;
      for (i = 0; i < pingedTasks.length; i++) {
        var task = pingedTasks[i],
          request = request$jscomp$2,
          segment = task.blockedSegment;
        if (null === segment) {
          var request$jscomp$0 = request;
          if (0 !== task.replay.pendingTasks) {
            switchContext(task.context);
            try {
              "number" === typeof task.replay.slots
                ? resumeNode(
                    request$jscomp$0,
                    task,
                    task.replay.slots,
                    task.node,
                    task.childIndex
                  )
                : retryNode(request$jscomp$0, task);
              if (
                1 === task.replay.pendingTasks &&
                0 < task.replay.nodes.length
              )
                throw Error(formatProdErrorMessage(488));
              task.replay.pendingTasks--;
              task.abortSet.delete(task);
              finishedTask(
                request$jscomp$0,
                task.blockedBoundary,
                task.row,
                null
              );
            } catch (thrownValue) {
              resetHooksState();
              var x =
                thrownValue === SuspenseException
                  ? getSuspendedThenable()
                  : thrownValue;
              if (
                "object" === typeof x &&
                null !== x &&
                "function" === typeof x.then
              ) {
                var ping = task.ping;
                x.then(ping, ping);
                task.thenableState =
                  thrownValue === SuspenseException
                    ? getThenableStateAfterSuspending()
                    : null;
              } else {
                task.replay.pendingTasks--;
                task.abortSet.delete(task);
                var errorInfo = getThrownInfo(task.componentStack);
                request = void 0;
                var request$jscomp$1 = request$jscomp$0,
                  boundary = task.blockedBoundary,
                  error$jscomp$0 =
                    12 === request$jscomp$0.status
                      ? request$jscomp$0.fatalError
                      : x,
                  replayNodes = task.replay.nodes,
                  resumeSlots = task.replay.slots;
                request = logRecoverableError(
                  request$jscomp$1,
                  error$jscomp$0,
                  errorInfo
                );
                abortRemainingReplayNodes(
                  request$jscomp$1,
                  boundary,
                  replayNodes,
                  resumeSlots,
                  error$jscomp$0,
                  request
                );
                request$jscomp$0.pendingRootTasks--;
                0 === request$jscomp$0.pendingRootTasks &&
                  completeShell(request$jscomp$0);
                request$jscomp$0.allPendingTasks--;
                0 === request$jscomp$0.allPendingTasks &&
                  completeAll(request$jscomp$0);
              }
            } finally {
            }
          }
        } else if (
          ((request$jscomp$0 = void 0),
          (request$jscomp$1 = segment),
          0 === request$jscomp$1.status)
        ) {
          request$jscomp$1.status = 6;
          switchContext(task.context);
          var childrenLength = request$jscomp$1.children.length,
            chunkLength = request$jscomp$1.chunks.length;
          try {
            retryNode(request, task),
              pushSegmentFinale(
                request$jscomp$1.chunks,
                request.renderState,
                request$jscomp$1.lastPushedText,
                request$jscomp$1.textEmbedded
              ),
              task.abortSet.delete(task),
              (request$jscomp$1.status = 1),
              finishedTask(
                request,
                task.blockedBoundary,
                task.row,
                request$jscomp$1
              );
          } catch (thrownValue) {
            resetHooksState();
            request$jscomp$1.children.length = childrenLength;
            request$jscomp$1.chunks.length = chunkLength;
            var x$jscomp$0 =
              thrownValue === SuspenseException
                ? getSuspendedThenable()
                : 12 === request.status
                  ? request.fatalError
                  : thrownValue;
            if (12 === request.status && null !== request.trackedPostpones) {
              var trackedPostpones = request.trackedPostpones,
                thrownInfo = getThrownInfo(task.componentStack);
              task.abortSet.delete(task);
              logRecoverableError(request, x$jscomp$0, thrownInfo);
              trackPostpone(request, trackedPostpones, task, request$jscomp$1);
              finishedTask(
                request,
                task.blockedBoundary,
                task.row,
                request$jscomp$1
              );
            } else if (
              "object" === typeof x$jscomp$0 &&
              null !== x$jscomp$0 &&
              "function" === typeof x$jscomp$0.then
            ) {
              request$jscomp$1.status = 0;
              task.thenableState =
                thrownValue === SuspenseException
                  ? getThenableStateAfterSuspending()
                  : null;
              var ping$jscomp$0 = task.ping;
              x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
            } else {
              var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
              task.abortSet.delete(task);
              request$jscomp$1.status = 4;
              var boundary$jscomp$0 = task.blockedBoundary,
                row = task.row;
              null !== row &&
                0 === --row.pendingTasks &&
                finishSuspenseListRow(request, row);
              request.allPendingTasks--;
              request$jscomp$0 = logRecoverableError(
                request,
                x$jscomp$0,
                errorInfo$jscomp$0
              );
              if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
              else if (
                (boundary$jscomp$0.pendingTasks--,
                4 !== boundary$jscomp$0.status)
              ) {
                boundary$jscomp$0.status = 4;
                boundary$jscomp$0.errorDigest = request$jscomp$0;
                untrackBoundary(request, boundary$jscomp$0);
                var boundaryRow = boundary$jscomp$0.row;
                null !== boundaryRow &&
                  0 === --boundaryRow.pendingTasks &&
                  finishSuspenseListRow(request, boundaryRow);
                boundary$jscomp$0.parentFlushed &&
                  request.clientRenderedBoundaries.push(boundary$jscomp$0);
                0 === request.pendingRootTasks &&
                  null === request.trackedPostpones &&
                  null !== boundary$jscomp$0.contentPreamble &&
                  preparePreamble(request);
              }
              0 === request.allPendingTasks && completeAll(request);
            }
          } finally {
          }
        }
      }
      pingedTasks.splice(0, i);
      null !== request$jscomp$2.destination &&
        flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
    } catch (error) {
      logRecoverableError(request$jscomp$2, error, {}),
        fatalError(request$jscomp$2, error);
    } finally {
      (currentResumableState = prevResumableState),
        (ReactSharedInternals.H = prevDispatcher),
        (ReactSharedInternals.A = prevAsyncDispatcher),
        prevDispatcher === HooksDispatcher && switchContext(prevContext),
        (currentRequest = prevRequest);
    }
  }
}
function preparePreambleFromSubtree(
  request,
  segment,
  collectedPreambleSegments
) {
  segment.preambleChildren.length &&
    collectedPreambleSegments.push(segment.preambleChildren);
  for (var pendingPreambles = !1, i = 0; i < segment.children.length; i++)
    pendingPreambles =
      preparePreambleFromSegment(
        request,
        segment.children[i],
        collectedPreambleSegments
      ) || pendingPreambles;
  return pendingPreambles;
}
function preparePreambleFromSegment(
  request,
  segment,
  collectedPreambleSegments
) {
  var boundary = segment.boundary;
  if (null === boundary)
    return preparePreambleFromSubtree(
      request,
      segment,
      collectedPreambleSegments
    );
  var preamble = boundary.contentPreamble,
    fallbackPreamble = boundary.fallbackPreamble;
  if (null === preamble || null === fallbackPreamble) return !1;
  switch (boundary.status) {
    case 1:
      hoistPreambleState(request.renderState, preamble);
      request.byteSize += boundary.byteSize;
      segment = boundary.completedSegments[0];
      if (!segment) throw Error(formatProdErrorMessage(391));
      return preparePreambleFromSubtree(
        request,
        segment,
        collectedPreambleSegments
      );
    case 5:
      if (null !== request.trackedPostpones) return !0;
    case 4:
      if (1 === segment.status)
        return (
          hoistPreambleState(request.renderState, fallbackPreamble),
          preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          )
        );
    default:
      return !0;
  }
}
function preparePreamble(request) {
  if (
    request.completedRootSegment &&
    null === request.completedPreambleSegments
  ) {
    var collectedPreambleSegments = [],
      originalRequestByteSize = request.byteSize,
      hasPendingPreambles = preparePreambleFromSegment(
        request,
        request.completedRootSegment,
        collectedPreambleSegments
      ),
      preamble = request.renderState.preamble;
    !1 === hasPendingPreambles || (preamble.headChunks && preamble.bodyChunks)
      ? (request.completedPreambleSegments = collectedPreambleSegments)
      : (request.byteSize = originalRequestByteSize);
  }
}
function flushSubtree(request, destination, segment, hoistableState) {
  segment.parentFlushed = !0;
  switch (segment.status) {
    case 0:
      segment.id = request.nextSegmentId++;
    case 5:
      return (
        (hoistableState = segment.id),
        (segment.lastPushedText = !1),
        (segment.textEmbedded = !1),
        (request = request.renderState),
        destination.push('<template id="'),
        destination.push(request.placeholderPrefix),
        (request = hoistableState.toString(16)),
        destination.push(request),
        destination.push('"></template>')
      );
    case 1:
      segment.status = 2;
      var r = !0,
        chunks = segment.chunks,
        chunkIdx = 0;
      segment = segment.children;
      for (var childIdx = 0; childIdx < segment.length; childIdx++) {
        for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++)
          destination.push(chunks[chunkIdx]);
        r = flushSegment(request, destination, r, hoistableState);
      }
      for (; chunkIdx < chunks.length - 1; chunkIdx++)
        destination.push(chunks[chunkIdx]);
      chunkIdx < chunks.length && (r = destination.push(chunks[chunkIdx]));
      return r;
    case 3:
      return !0;
    default:
      throw Error(formatProdErrorMessage(390));
  }
}
var flushedByteSize = 0;
function flushSegment(request, destination, segment, hoistableState) {
  var boundary = segment.boundary;
  if (null === boundary)
    return flushSubtree(request, destination, segment, hoistableState);
  boundary.parentFlushed = !0;
  if (4 === boundary.status) {
    var row = boundary.row;
    null !== row &&
      0 === --row.pendingTasks &&
      finishSuspenseListRow(request, row);
    request.renderState.generateStaticMarkup ||
      ((boundary = boundary.errorDigest),
      destination.push("\x3c!--$!--\x3e"),
      destination.push("<template"),
      boundary &&
        (destination.push(' data-dgst="'),
        (boundary = escapeTextForBrowser(boundary)),
        destination.push(boundary),
        destination.push('"')),
      destination.push("></template>"));
    flushSubtree(request, destination, segment, hoistableState);
    request = request.renderState.generateStaticMarkup
      ? !0
      : destination.push("\x3c!--/$--\x3e");
    return request;
  }
  if (1 !== boundary.status)
    return (
      0 === boundary.status &&
        (boundary.rootSegmentID = request.nextSegmentId++),
      0 < boundary.completedSegments.length &&
        request.partialBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      hoistableState && hoistHoistables(hoistableState, boundary.fallbackState),
      flushSubtree(request, destination, segment, hoistableState),
      destination.push("\x3c!--/$--\x3e")
    );
  if (
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    flushedByteSize + boundary.byteSize > request.progressiveChunkSize
  )
    return (
      (boundary.rootSegmentID = request.nextSegmentId++),
      request.completedBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      flushSubtree(request, destination, segment, hoistableState),
      destination.push("\x3c!--/$--\x3e")
    );
  flushedByteSize += boundary.byteSize;
  hoistableState && hoistHoistables(hoistableState, boundary.contentState);
  segment = boundary.row;
  null !== segment &&
    isEligibleForOutlining(request, boundary) &&
    0 === --segment.pendingTasks &&
    finishSuspenseListRow(request, segment);
  request.renderState.generateStaticMarkup ||
    destination.push("\x3c!--$--\x3e");
  segment = boundary.completedSegments;
  if (1 !== segment.length) throw Error(formatProdErrorMessage(391));
  flushSegment(request, destination, segment[0], hoistableState);
  request = request.renderState.generateStaticMarkup
    ? !0
    : destination.push("\x3c!--/$--\x3e");
  return request;
}
function flushSegmentContainer(request, destination, segment, hoistableState) {
  writeStartSegment(
    destination,
    request.renderState,
    segment.parentFormatContext,
    segment.id
  );
  flushSegment(request, destination, segment, hoistableState);
  return writeEndSegment(destination, segment.parentFormatContext);
}
function flushCompletedBoundary(request, destination, boundary) {
  flushedByteSize = boundary.byteSize;
  for (
    var completedSegments = boundary.completedSegments, i = 0;
    i < completedSegments.length;
    i++
  )
    flushPartiallyCompletedSegment(
      request,
      destination,
      boundary,
      completedSegments[i]
    );
  completedSegments.length = 0;
  completedSegments = boundary.row;
  null !== completedSegments &&
    isEligibleForOutlining(request, boundary) &&
    0 === --completedSegments.pendingTasks &&
    finishSuspenseListRow(request, completedSegments);
  writeHoistablesForBoundary(
    destination,
    boundary.contentState,
    request.renderState
  );
  completedSegments = request.resumableState;
  request = request.renderState;
  i = boundary.rootSegmentID;
  boundary = boundary.contentState;
  var requiresStyleInsertion = request.stylesToHoist;
  request.stylesToHoist = !1;
  destination.push(request.startInlineScript);
  destination.push(">");
  requiresStyleInsertion
    ? (0 === (completedSegments.instructions & 4) &&
        ((completedSegments.instructions |= 4),
        destination.push(
          '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'
        )),
      0 === (completedSegments.instructions & 2) &&
        ((completedSegments.instructions |= 2),
        destination.push(
          '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
        )),
      0 === (completedSegments.instructions & 8)
        ? ((completedSegments.instructions |= 8),
          destination.push(
            '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("'
          ))
        : destination.push('$RR("'))
    : (0 === (completedSegments.instructions & 2) &&
        ((completedSegments.instructions |= 2),
        destination.push(
          '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
        )),
      destination.push('$RC("'));
  completedSegments = i.toString(16);
  destination.push(request.boundaryPrefix);
  destination.push(completedSegments);
  destination.push('","');
  destination.push(request.segmentPrefix);
  destination.push(completedSegments);
  requiresStyleInsertion
    ? (destination.push('",'),
      writeStyleResourceDependenciesInJS(destination, boundary))
    : destination.push('"');
  boundary = destination.push(")\x3c/script>");
  return writeBootstrap(destination, request) && boundary;
}
function flushPartiallyCompletedSegment(
  request,
  destination,
  boundary,
  segment
) {
  if (2 === segment.status) return !0;
  var hoistableState = boundary.contentState,
    segmentID = segment.id;
  if (-1 === segmentID) {
    if (-1 === (segment.id = boundary.rootSegmentID))
      throw Error(formatProdErrorMessage(392));
    return flushSegmentContainer(request, destination, segment, hoistableState);
  }
  if (segmentID === boundary.rootSegmentID)
    return flushSegmentContainer(request, destination, segment, hoistableState);
  flushSegmentContainer(request, destination, segment, hoistableState);
  boundary = request.resumableState;
  request = request.renderState;
  destination.push(request.startInlineScript);
  destination.push(">");
  0 === (boundary.instructions & 1)
    ? ((boundary.instructions |= 1),
      destination.push(
        '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'
      ))
    : destination.push('$RS("');
  destination.push(request.segmentPrefix);
  segmentID = segmentID.toString(16);
  destination.push(segmentID);
  destination.push('","');
  destination.push(request.placeholderPrefix);
  destination.push(segmentID);
  destination = destination.push('")\x3c/script>');
  return destination;
}
var flushingPartialBoundaries = !1;
function flushCompletedQueues(request, destination) {
  try {
    if (!(0 < request.pendingRootTasks)) {
      var i,
        completedRootSegment = request.completedRootSegment;
      if (null !== completedRootSegment) {
        if (5 === completedRootSegment.status) return;
        var completedPreambleSegments = request.completedPreambleSegments;
        if (null === completedPreambleSegments) return;
        flushedByteSize = request.byteSize;
        var resumableState = request.resumableState,
          renderState = request.renderState,
          preamble = renderState.preamble,
          htmlChunks = preamble.htmlChunks,
          headChunks = preamble.headChunks,
          i$jscomp$0;
        if (htmlChunks) {
          for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
            destination.push(htmlChunks[i$jscomp$0]);
          if (headChunks)
            for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
              destination.push(headChunks[i$jscomp$0]);
          else {
            var chunk = startChunkForTag("head");
            destination.push(chunk);
            destination.push(">");
          }
        } else if (headChunks)
          for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
            destination.push(headChunks[i$jscomp$0]);
        var charsetChunks = renderState.charsetChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
          destination.push(charsetChunks[i$jscomp$0]);
        charsetChunks.length = 0;
        renderState.preconnects.forEach(flushResource, destination);
        renderState.preconnects.clear();
        var viewportChunks = renderState.viewportChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
          destination.push(viewportChunks[i$jscomp$0]);
        viewportChunks.length = 0;
        renderState.fontPreloads.forEach(flushResource, destination);
        renderState.fontPreloads.clear();
        renderState.highImagePreloads.forEach(flushResource, destination);
        renderState.highImagePreloads.clear();
        currentlyFlushingRenderState = renderState;
        renderState.styles.forEach(flushStylesInPreamble, destination);
        currentlyFlushingRenderState = null;
        var importMapChunks = renderState.importMapChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
          destination.push(importMapChunks[i$jscomp$0]);
        importMapChunks.length = 0;
        renderState.bootstrapScripts.forEach(flushResource, destination);
        renderState.scripts.forEach(flushResource, destination);
        renderState.scripts.clear();
        renderState.bulkPreloads.forEach(flushResource, destination);
        renderState.bulkPreloads.clear();
        resumableState.instructions |= 32;
        var hoistableChunks = renderState.hoistableChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
          destination.push(hoistableChunks[i$jscomp$0]);
        for (
          resumableState = hoistableChunks.length = 0;
          resumableState < completedPreambleSegments.length;
          resumableState++
        ) {
          var segments = completedPreambleSegments[resumableState];
          for (renderState = 0; renderState < segments.length; renderState++)
            flushSegment(request, destination, segments[renderState], null);
        }
        var preamble$jscomp$0 = request.renderState.preamble,
          headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
        if (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) {
          var chunk$jscomp$0 = endChunkForTag("head");
          destination.push(chunk$jscomp$0);
        }
        var bodyChunks = preamble$jscomp$0.bodyChunks;
        if (bodyChunks)
          for (
            completedPreambleSegments = 0;
            completedPreambleSegments < bodyChunks.length;
            completedPreambleSegments++
          )
            destination.push(bodyChunks[completedPreambleSegments]);
        flushSegment(request, destination, completedRootSegment, null);
        request.completedRootSegment = null;
        var renderState$jscomp$0 = request.renderState;
        if (
          0 !== request.allPendingTasks ||
          0 !== request.clientRenderedBoundaries.length ||
          0 !== request.completedBoundaries.length ||
          (null !== request.trackedPostpones &&
            (0 !== request.trackedPostpones.rootNodes.length ||
              null !== request.trackedPostpones.rootSlots))
        ) {
          var resumableState$jscomp$0 = request.resumableState;
          if (0 === (resumableState$jscomp$0.instructions & 64)) {
            resumableState$jscomp$0.instructions |= 64;
            destination.push(renderState$jscomp$0.startInlineScript);
            if (0 === (resumableState$jscomp$0.instructions & 32)) {
              resumableState$jscomp$0.instructions |= 32;
              var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
              destination.push(' id="');
              var chunk$jscomp$1 = escapeTextForBrowser(shellId);
              destination.push(chunk$jscomp$1);
              destination.push('"');
            }
            destination.push(">");
            destination.push(
              "requestAnimationFrame(function(){$RT=performance.now()});"
            );
            destination.push("\x3c/script>");
          }
        }
        writeBootstrap(destination, renderState$jscomp$0);
      }
      var renderState$jscomp$1 = request.renderState;
      completedRootSegment = 0;
      var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < viewportChunks$jscomp$0.length;
        completedRootSegment++
      )
        destination.push(viewportChunks$jscomp$0[completedRootSegment]);
      viewportChunks$jscomp$0.length = 0;
      renderState$jscomp$1.preconnects.forEach(flushResource, destination);
      renderState$jscomp$1.preconnects.clear();
      renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.fontPreloads.clear();
      renderState$jscomp$1.highImagePreloads.forEach(
        flushResource,
        destination
      );
      renderState$jscomp$1.highImagePreloads.clear();
      renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
      renderState$jscomp$1.scripts.forEach(flushResource, destination);
      renderState$jscomp$1.scripts.clear();
      renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.bulkPreloads.clear();
      var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < hoistableChunks$jscomp$0.length;
        completedRootSegment++
      )
        destination.push(hoistableChunks$jscomp$0[completedRootSegment]);
      hoistableChunks$jscomp$0.length = 0;
      var clientRenderedBoundaries = request.clientRenderedBoundaries;
      for (i = 0; i < clientRenderedBoundaries.length; i++) {
        var boundary = clientRenderedBoundaries[i];
        renderState$jscomp$1 = destination;
        var resumableState$jscomp$1 = request.resumableState,
          renderState$jscomp$2 = request.renderState,
          id = boundary.rootSegmentID,
          errorDigest = boundary.errorDigest;
        renderState$jscomp$1.push(renderState$jscomp$2.startInlineScript);
        renderState$jscomp$1.push(">");
        0 === (resumableState$jscomp$1.instructions & 4)
          ? ((resumableState$jscomp$1.instructions |= 4),
            renderState$jscomp$1.push(
              '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'
            ))
          : renderState$jscomp$1.push('$RX("');
        renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
        var chunk$jscomp$2 = id.toString(16);
        renderState$jscomp$1.push(chunk$jscomp$2);
        renderState$jscomp$1.push('"');
        if (errorDigest) {
          renderState$jscomp$1.push(",");
          var chunk$jscomp$3 = escapeJSStringsForInstructionScripts(
            errorDigest || ""
          );
          renderState$jscomp$1.push(chunk$jscomp$3);
        }
        var JSCompiler_inline_result =
          renderState$jscomp$1.push(")\x3c/script>");
        if (!JSCompiler_inline_result) {
          request.destination = null;
          i++;
          clientRenderedBoundaries.splice(0, i);
          return;
        }
      }
      clientRenderedBoundaries.splice(0, i);
      var completedBoundaries = request.completedBoundaries;
      for (i = 0; i < completedBoundaries.length; i++)
        if (
          !flushCompletedBoundary(request, destination, completedBoundaries[i])
        ) {
          request.destination = null;
          i++;
          completedBoundaries.splice(0, i);
          return;
        }
      completedBoundaries.splice(0, i);
      flushingPartialBoundaries = !0;
      var partialBoundaries = request.partialBoundaries;
      for (i = 0; i < partialBoundaries.length; i++) {
        var boundary$69 = partialBoundaries[i];
        a: {
          clientRenderedBoundaries = request;
          boundary = destination;
          flushedByteSize = boundary$69.byteSize;
          var completedSegments = boundary$69.completedSegments;
          for (
            JSCompiler_inline_result = 0;
            JSCompiler_inline_result < completedSegments.length;
            JSCompiler_inline_result++
          )
            if (
              !flushPartiallyCompletedSegment(
                clientRenderedBoundaries,
                boundary,
                boundary$69,
                completedSegments[JSCompiler_inline_result]
              )
            ) {
              JSCompiler_inline_result++;
              completedSegments.splice(0, JSCompiler_inline_result);
              var JSCompiler_inline_result$jscomp$0 = !1;
              break a;
            }
          completedSegments.splice(0, JSCompiler_inline_result);
          var row = boundary$69.row;
          null !== row &&
            row.together &&
            1 === boundary$69.pendingTasks &&
            (1 === row.pendingTasks
              ? unblockSuspenseListRow(
                  clientRenderedBoundaries,
                  row,
                  row.hoistables
                )
              : row.pendingTasks--);
          JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
            boundary,
            boundary$69.contentState,
            clientRenderedBoundaries.renderState
          );
        }
        if (!JSCompiler_inline_result$jscomp$0) {
          request.destination = null;
          i++;
          partialBoundaries.splice(0, i);
          return;
        }
      }
      partialBoundaries.splice(0, i);
      flushingPartialBoundaries = !1;
      var largeBoundaries = request.completedBoundaries;
      for (i = 0; i < largeBoundaries.length; i++)
        if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
          request.destination = null;
          i++;
          largeBoundaries.splice(0, i);
          return;
        }
      largeBoundaries.splice(0, i);
    }
  } finally {
    (flushingPartialBoundaries = !1),
      0 === request.allPendingTasks &&
        0 === request.clientRenderedBoundaries.length &&
        0 === request.completedBoundaries.length &&
        ((request.flushScheduled = !1),
        (i = request.resumableState),
        i.hasBody &&
          ((partialBoundaries = endChunkForTag("body")),
          destination.push(partialBoundaries)),
        i.hasHtml && ((i = endChunkForTag("html")), destination.push(i)),
        (request.status = 14),
        destination.push(null),
        (request.destination = null));
  }
}
function enqueueFlush(request) {
  if (
    !1 === request.flushScheduled &&
    0 === request.pingedTasks.length &&
    null !== request.destination
  ) {
    request.flushScheduled = !0;
    var destination = request.destination;
    destination
      ? flushCompletedQueues(request, destination)
      : (request.flushScheduled = !1);
  }
}
function startFlowing(request, destination) {
  if (13 === request.status)
    (request.status = 14), destination.destroy(request.fatalError);
  else if (14 !== request.status && null === request.destination) {
    request.destination = destination;
    try {
      flushCompletedQueues(request, destination);
    } catch (error) {
      logRecoverableError(request, error, {}), fatalError(request, error);
    }
  }
}
function abort(request, reason) {
  if (11 === request.status || 10 === request.status) request.status = 12;
  try {
    var abortableTasks = request.abortableTasks;
    if (0 < abortableTasks.size) {
      var error =
        void 0 === reason
          ? Error(formatProdErrorMessage(432))
          : "object" === typeof reason &&
              null !== reason &&
              "function" === typeof reason.then
            ? Error(formatProdErrorMessage(530))
            : reason;
      request.fatalError = error;
      abortableTasks.forEach(function (task) {
        return abortTask(task, request, error);
      });
      abortableTasks.clear();
    }
    null !== request.destination &&
      flushCompletedQueues(request, request.destination);
  } catch (error$71) {
    logRecoverableError(request, error$71, {}), fatalError(request, error$71);
  }
}
function addToReplayParent(node, parentKeyPath, trackedPostpones) {
  if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
  else {
    var workingMap = trackedPostpones.workingMap,
      parentNode = workingMap.get(parentKeyPath);
    void 0 === parentNode &&
      ((parentNode = [parentKeyPath[1], parentKeyPath[2], [], null]),
      workingMap.set(parentKeyPath, parentNode),
      addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
    parentNode[2].push(node);
  }
}
function onError() {}
function renderToStringImpl(
  children,
  options,
  generateStaticMarkup,
  abortReason
) {
  var didFatal = !1,
    fatalError = null,
    result = "",
    readyToStream = !1;
  options = createResumableState(options ? options.identifierPrefix : void 0);
  children = createRequest(
    children,
    options,
    createRenderState(options, generateStaticMarkup),
    createFormatContext(0, null, 0, null),
    Infinity,
    onError,
    void 0,
    function () {
      readyToStream = !0;
    },
    void 0,
    void 0,
    void 0
  );
  children.flushScheduled = null !== children.destination;
  performWork(children);
  10 === children.status && (children.status = 11);
  null === children.trackedPostpones &&
    safelyEmitEarlyPreloads(children, 0 === children.pendingRootTasks);
  abort(children, abortReason);
  startFlowing(children, {
    push: function (chunk) {
      null !== chunk && (result += chunk);
      return !0;
    },
    destroy: function (error) {
      didFatal = !0;
      fatalError = error;
    }
  });
  if (didFatal && fatalError !== abortReason) throw fatalError;
  if (!readyToStream) throw Error(formatProdErrorMessage(426));
  return result;
}
exports.renderToStaticMarkup = function (children, options) {
  return renderToStringImpl(
    children,
    options,
    !0,
    'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server'
  );
};
exports.renderToString = function (children, options) {
  return renderToStringImpl(
    children,
    options,
    !1,
    'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server'
  );
};
exports.version = "19.2.0";


/***/ }),

/***/ 221:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var React = __webpack_require__(540);
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
function noop() {}
var Internals = {
    d: {
      f: noop,
      r: function () {
        throw Error(formatProdErrorMessage(522));
      },
      D: noop,
      C: noop,
      L: noop,
      m: noop,
      X: noop,
      S: noop,
      M: noop
    },
    p: 0,
    findDOMNode: null
  },
  REACT_PORTAL_TYPE = Symbol.for("react.portal");
function createPortal$1(children, containerInfo, implementation) {
  var key =
    3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: null == key ? null : "" + key,
    children: children,
    containerInfo: containerInfo,
    implementation: implementation
  };
}
var ReactSharedInternals =
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function getCrossOriginStringAs(as, input) {
  if ("font" === as) return "";
  if ("string" === typeof input)
    return "use-credentials" === input ? input : "";
}
exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  Internals;
exports.createPortal = function (children, container) {
  var key =
    2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (
    !container ||
    (1 !== container.nodeType &&
      9 !== container.nodeType &&
      11 !== container.nodeType)
  )
    throw Error(formatProdErrorMessage(299));
  return createPortal$1(children, container, null, key);
};
exports.flushSync = function (fn) {
  var previousTransition = ReactSharedInternals.T,
    previousUpdatePriority = Internals.p;
  try {
    if (((ReactSharedInternals.T = null), (Internals.p = 2), fn)) return fn();
  } finally {
    (ReactSharedInternals.T = previousTransition),
      (Internals.p = previousUpdatePriority),
      Internals.d.f();
  }
};
exports.preconnect = function (href, options) {
  "string" === typeof href &&
    (options
      ? ((options = options.crossOrigin),
        (options =
          "string" === typeof options
            ? "use-credentials" === options
              ? options
              : ""
            : void 0))
      : (options = null),
    Internals.d.C(href, options));
};
exports.prefetchDNS = function (href) {
  "string" === typeof href && Internals.d.D(href);
};
exports.preinit = function (href, options) {
  if ("string" === typeof href && options && "string" === typeof options.as) {
    var as = options.as,
      crossOrigin = getCrossOriginStringAs(as, options.crossOrigin),
      integrity =
        "string" === typeof options.integrity ? options.integrity : void 0,
      fetchPriority =
        "string" === typeof options.fetchPriority
          ? options.fetchPriority
          : void 0;
    "style" === as
      ? Internals.d.S(
          href,
          "string" === typeof options.precedence ? options.precedence : void 0,
          {
            crossOrigin: crossOrigin,
            integrity: integrity,
            fetchPriority: fetchPriority
          }
        )
      : "script" === as &&
        Internals.d.X(href, {
          crossOrigin: crossOrigin,
          integrity: integrity,
          fetchPriority: fetchPriority,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0
        });
  }
};
exports.preinitModule = function (href, options) {
  if ("string" === typeof href)
    if ("object" === typeof options && null !== options) {
      if (null == options.as || "script" === options.as) {
        var crossOrigin = getCrossOriginStringAs(
          options.as,
          options.crossOrigin
        );
        Internals.d.M(href, {
          crossOrigin: crossOrigin,
          integrity:
            "string" === typeof options.integrity ? options.integrity : void 0,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0
        });
      }
    } else null == options && Internals.d.M(href);
};
exports.preload = function (href, options) {
  if (
    "string" === typeof href &&
    "object" === typeof options &&
    null !== options &&
    "string" === typeof options.as
  ) {
    var as = options.as,
      crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
    Internals.d.L(href, as, {
      crossOrigin: crossOrigin,
      integrity:
        "string" === typeof options.integrity ? options.integrity : void 0,
      nonce: "string" === typeof options.nonce ? options.nonce : void 0,
      type: "string" === typeof options.type ? options.type : void 0,
      fetchPriority:
        "string" === typeof options.fetchPriority
          ? options.fetchPriority
          : void 0,
      referrerPolicy:
        "string" === typeof options.referrerPolicy
          ? options.referrerPolicy
          : void 0,
      imageSrcSet:
        "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
      imageSizes:
        "string" === typeof options.imageSizes ? options.imageSizes : void 0,
      media: "string" === typeof options.media ? options.media : void 0
    });
  }
};
exports.preloadModule = function (href, options) {
  if ("string" === typeof href)
    if (options) {
      var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
      Internals.d.m(href, {
        as:
          "string" === typeof options.as && "script" !== options.as
            ? options.as
            : void 0,
        crossOrigin: crossOrigin,
        integrity:
          "string" === typeof options.integrity ? options.integrity : void 0
      });
    } else Internals.d.m(href);
};
exports.requestFormReset = function (form) {
  Internals.d.r(form);
};
exports.unstable_batchedUpdates = function (fn, a) {
  return fn(a);
};
exports.useFormState = function (action, initialState, permalink) {
  return ReactSharedInternals.H.useFormState(action, initialState, permalink);
};
exports.useFormStatus = function () {
  return ReactSharedInternals.H.useHostTransitionStatus();
};
exports.version = "19.2.0";


/***/ }),

/***/ 540:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(869);
} else // removed by dead control flow
{}


/***/ }),

/***/ 848:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;


var l, s;
if (true) {
  l = __webpack_require__(47);
  s = __webpack_require__(909);
} else // removed by dead control flow
{}

__webpack_unused_export__ = l.version;
__webpack_unused_export__ = l.renderToString;
exports.qV = l.renderToStaticMarkup;
__webpack_unused_export__ = s.renderToReadableStream;
__webpack_unused_export__ = s.resume;


/***/ }),

/***/ 869:
/***/ ((__unused_webpack_module, exports) => {

/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var ReactNoopUpdateQueue = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {}
  },
  assign = Object.assign,
  emptyObject = {};
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
Component.prototype.isReactComponent = {};
Component.prototype.setState = function (partialState, callback) {
  if (
    "object" !== typeof partialState &&
    "function" !== typeof partialState &&
    null != partialState
  )
    throw Error(
      "takes an object of state variables to update or a function which returns an object of state variables."
    );
  this.updater.enqueueSetState(this, partialState, callback, "setState");
};
Component.prototype.forceUpdate = function (callback) {
  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
};
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = !0;
var isArrayImpl = Array.isArray;
function noop() {}
var ReactSharedInternals = { H: null, A: null, T: null, S: null },
  hasOwnProperty = Object.prototype.hasOwnProperty;
function ReactElement(type, key, props) {
  var refProp = props.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== refProp ? refProp : null,
    props: props
  };
}
function cloneAndReplaceKey(oldElement, newKey) {
  return ReactElement(oldElement.type, newKey, oldElement.props);
}
function isValidElement(object) {
  return (
    "object" === typeof object &&
    null !== object &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
function escape(key) {
  var escaperLookup = { "=": "=0", ":": "=2" };
  return (
    "$" +
    key.replace(/[=:]/g, function (match) {
      return escaperLookup[match];
    })
  );
}
var userProvidedKeyEscapeRegex = /\/+/g;
function getElementKey(element, index) {
  return "object" === typeof element && null !== element && null != element.key
    ? escape("" + element.key)
    : index.toString(36);
}
function resolveThenable(thenable) {
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      switch (
        ("string" === typeof thenable.status
          ? thenable.then(noop, noop)
          : ((thenable.status = "pending"),
            thenable.then(
              function (fulfilledValue) {
                "pending" === thenable.status &&
                  ((thenable.status = "fulfilled"),
                  (thenable.value = fulfilledValue));
              },
              function (error) {
                "pending" === thenable.status &&
                  ((thenable.status = "rejected"), (thenable.reason = error));
              }
            )),
        thenable.status)
      ) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
  }
  throw thenable;
}
function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
  var type = typeof children;
  if ("undefined" === type || "boolean" === type) children = null;
  var invokeCallback = !1;
  if (null === children) invokeCallback = !0;
  else
    switch (type) {
      case "bigint":
      case "string":
      case "number":
        invokeCallback = !0;
        break;
      case "object":
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = !0;
            break;
          case REACT_LAZY_TYPE:
            return (
              (invokeCallback = children._init),
              mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              )
            );
        }
    }
  if (invokeCallback)
    return (
      (callback = callback(children)),
      (invokeCallback =
        "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
      isArrayImpl(callback)
        ? ((escapedPrefix = ""),
          null != invokeCallback &&
            (escapedPrefix =
              invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
          mapIntoArray(callback, array, escapedPrefix, "", function (c) {
            return c;
          }))
        : null != callback &&
          (isValidElement(callback) &&
            (callback = cloneAndReplaceKey(
              callback,
              escapedPrefix +
                (null == callback.key ||
                (children && children.key === callback.key)
                  ? ""
                  : ("" + callback.key).replace(
                      userProvidedKeyEscapeRegex,
                      "$&/"
                    ) + "/") +
                invokeCallback
            )),
          array.push(callback)),
      1
    );
  invokeCallback = 0;
  var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
  if (isArrayImpl(children))
    for (var i = 0; i < children.length; i++)
      (nameSoFar = children[i]),
        (type = nextNamePrefix + getElementKey(nameSoFar, i)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if (((i = getIteratorFn(children)), "function" === typeof i))
    for (
      children = i.call(children), i = 0;
      !(nameSoFar = children.next()).done;

    )
      (nameSoFar = nameSoFar.value),
        (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if ("object" === type) {
    if ("function" === typeof children.then)
      return mapIntoArray(
        resolveThenable(children),
        array,
        escapedPrefix,
        nameSoFar,
        callback
      );
    array = String(children);
    throw Error(
      "Objects are not valid as a React child (found: " +
        ("[object Object]" === array
          ? "object with keys {" + Object.keys(children).join(", ") + "}"
          : array) +
        "). If you meant to render a collection of children, use an array instead."
    );
  }
  return invokeCallback;
}
function mapChildren(children, func, context) {
  if (null == children) return children;
  var result = [],
    count = 0;
  mapIntoArray(children, result, "", "", function (child) {
    return func.call(context, child, count++);
  });
  return result;
}
function lazyInitializer(payload) {
  if (-1 === payload._status) {
    var ctor = payload._result;
    ctor = ctor();
    ctor.then(
      function (moduleObject) {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 1), (payload._result = moduleObject);
      },
      function (error) {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 2), (payload._result = error);
      }
    );
    -1 === payload._status && ((payload._status = 0), (payload._result = ctor));
  }
  if (1 === payload._status) return payload._result.default;
  throw payload._result;
}
var reportGlobalError =
    "function" === typeof reportError
      ? reportError
      : function (error) {
          if (
            "object" === typeof window &&
            "function" === typeof window.ErrorEvent
          ) {
            var event = new window.ErrorEvent("error", {
              bubbles: !0,
              cancelable: !0,
              message:
                "object" === typeof error &&
                null !== error &&
                "string" === typeof error.message
                  ? String(error.message)
                  : String(error),
              error: error
            });
            if (!window.dispatchEvent(event)) return;
          } else if (
            "object" === typeof process &&
            "function" === typeof process.emit
          ) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        },
  Children = {
    map: mapChildren,
    forEach: function (children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function () {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function (children) {
      var n = 0;
      mapChildren(children, function () {
        n++;
      });
      return n;
    },
    toArray: function (children) {
      return (
        mapChildren(children, function (child) {
          return child;
        }) || []
      );
    },
    only: function (children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
exports.Activity = REACT_ACTIVITY_TYPE;
exports.Children = Children;
exports.Component = Component;
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.Profiler = REACT_PROFILER_TYPE;
exports.PureComponent = PureComponent;
exports.StrictMode = REACT_STRICT_MODE_TYPE;
exports.Suspense = REACT_SUSPENSE_TYPE;
exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  ReactSharedInternals;
exports.__COMPILER_RUNTIME = {
  __proto__: null,
  c: function (size) {
    return ReactSharedInternals.H.useMemoCache(size);
  }
};
exports.cache = function (fn) {
  return function () {
    return fn.apply(null, arguments);
  };
};
exports.cacheSignal = function () {
  return null;
};
exports.cloneElement = function (element, config, children) {
  if (null === element || void 0 === element)
    throw Error(
      "The argument must be a React element, but you passed " + element + "."
    );
  var props = assign({}, element.props),
    key = element.key;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      !hasOwnProperty.call(config, propName) ||
        "key" === propName ||
        "__self" === propName ||
        "__source" === propName ||
        ("ref" === propName && void 0 === config.ref) ||
        (props[propName] = config[propName]);
  var propName = arguments.length - 2;
  if (1 === propName) props.children = children;
  else if (1 < propName) {
    for (var childArray = Array(propName), i = 0; i < propName; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  return ReactElement(element.type, key, props);
};
exports.createContext = function (defaultValue) {
  defaultValue = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    _threadCount: 0,
    Provider: null,
    Consumer: null
  };
  defaultValue.Provider = defaultValue;
  defaultValue.Consumer = {
    $$typeof: REACT_CONSUMER_TYPE,
    _context: defaultValue
  };
  return defaultValue;
};
exports.createElement = function (type, config, children) {
  var propName,
    props = {},
    key = null;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      hasOwnProperty.call(config, propName) &&
        "key" !== propName &&
        "__self" !== propName &&
        "__source" !== propName &&
        (props[propName] = config[propName]);
  var childrenLength = arguments.length - 2;
  if (1 === childrenLength) props.children = children;
  else if (1 < childrenLength) {
    for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  if (type && type.defaultProps)
    for (propName in ((childrenLength = type.defaultProps), childrenLength))
      void 0 === props[propName] &&
        (props[propName] = childrenLength[propName]);
  return ReactElement(type, key, props);
};
exports.createRef = function () {
  return { current: null };
};
exports.forwardRef = function (render) {
  return { $$typeof: REACT_FORWARD_REF_TYPE, render: render };
};
exports.isValidElement = isValidElement;
exports.lazy = function (ctor) {
  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: { _status: -1, _result: ctor },
    _init: lazyInitializer
  };
};
exports.memo = function (type, compare) {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type: type,
    compare: void 0 === compare ? null : compare
  };
};
exports.startTransition = function (scope) {
  var prevTransition = ReactSharedInternals.T,
    currentTransition = {};
  ReactSharedInternals.T = currentTransition;
  try {
    var returnValue = scope(),
      onStartTransitionFinish = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    "object" === typeof returnValue &&
      null !== returnValue &&
      "function" === typeof returnValue.then &&
      returnValue.then(noop, reportGlobalError);
  } catch (error) {
    reportGlobalError(error);
  } finally {
    null !== prevTransition &&
      null !== currentTransition.types &&
      (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
};
exports.unstable_useCacheRefresh = function () {
  return ReactSharedInternals.H.useCacheRefresh();
};
exports.use = function (usable) {
  return ReactSharedInternals.H.use(usable);
};
exports.useActionState = function (action, initialState, permalink) {
  return ReactSharedInternals.H.useActionState(action, initialState, permalink);
};
exports.useCallback = function (callback, deps) {
  return ReactSharedInternals.H.useCallback(callback, deps);
};
exports.useContext = function (Context) {
  return ReactSharedInternals.H.useContext(Context);
};
exports.useDebugValue = function () {};
exports.useDeferredValue = function (value, initialValue) {
  return ReactSharedInternals.H.useDeferredValue(value, initialValue);
};
exports.useEffect = function (create, deps) {
  return ReactSharedInternals.H.useEffect(create, deps);
};
exports.useEffectEvent = function (callback) {
  return ReactSharedInternals.H.useEffectEvent(callback);
};
exports.useId = function () {
  return ReactSharedInternals.H.useId();
};
exports.useImperativeHandle = function (ref, create, deps) {
  return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
};
exports.useInsertionEffect = function (create, deps) {
  return ReactSharedInternals.H.useInsertionEffect(create, deps);
};
exports.useLayoutEffect = function (create, deps) {
  return ReactSharedInternals.H.useLayoutEffect(create, deps);
};
exports.useMemo = function (create, deps) {
  return ReactSharedInternals.H.useMemo(create, deps);
};
exports.useOptimistic = function (passthrough, reducer) {
  return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
};
exports.useReducer = function (reducer, initialArg, init) {
  return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
};
exports.useRef = function (initialValue) {
  return ReactSharedInternals.H.useRef(initialValue);
};
exports.useState = function (initialState) {
  return ReactSharedInternals.H.useState(initialState);
};
exports.useSyncExternalStore = function (
  subscribe,
  getSnapshot,
  getServerSnapshot
) {
  return ReactSharedInternals.H.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
};
exports.useTransition = function () {
  return ReactSharedInternals.H.useTransition();
};
exports.version = "19.2.0";


/***/ }),

/***/ 909:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * @license React
 * react-dom-server.browser.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*


 JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)

 Copyright (c) 2011 Gary Court
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/

var React = __webpack_require__(540),
  ReactDOM = __webpack_require__(961);
function formatProdErrorMessage(code) {
  var url = "https://react.dev/errors/" + code;
  if (1 < arguments.length) {
    url += "?args[]=" + encodeURIComponent(arguments[1]);
    for (var i = 2; i < arguments.length; i++)
      url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return (
    "Minified React error #" +
    code +
    "; visit " +
    url +
    " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
  );
}
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy"),
  REACT_SCOPE_TYPE = Symbol.for("react.scope"),
  REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden"),
  REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable) {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var isArrayImpl = Array.isArray;
function murmurhash3_32_gc(key, seed) {
  var remainder = key.length & 3;
  var bytes = key.length - remainder;
  var h1 = seed;
  for (seed = 0; seed < bytes; ) {
    var k1 =
      (key.charCodeAt(seed) & 255) |
      ((key.charCodeAt(++seed) & 255) << 8) |
      ((key.charCodeAt(++seed) & 255) << 16) |
      ((key.charCodeAt(++seed) & 255) << 24);
    ++seed;
    k1 =
      (3432918353 * (k1 & 65535) +
        (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      (461845907 * (k1 & 65535) + (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
      4294967295;
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (5 * (h1 & 65535) + (((5 * (h1 >>> 16)) & 65535) << 16)) & 4294967295;
    h1 = (h1 & 65535) + 27492 + ((((h1 >>> 16) + 58964) & 65535) << 16);
  }
  k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
    case 2:
      k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
    case 1:
      (k1 ^= key.charCodeAt(seed) & 255),
        (k1 =
          (3432918353 * (k1 & 65535) +
            (((3432918353 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295),
        (k1 = (k1 << 15) | (k1 >>> 17)),
        (h1 ^=
          (461845907 * (k1 & 65535) +
            (((461845907 * (k1 >>> 16)) & 65535) << 16)) &
          4294967295);
  }
  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 =
    (2246822507 * (h1 & 65535) + (((2246822507 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  h1 ^= h1 >>> 13;
  h1 =
    (3266489909 * (h1 & 65535) + (((3266489909 * (h1 >>> 16)) & 65535) << 16)) &
    4294967295;
  return (h1 ^ (h1 >>> 16)) >>> 0;
}
var channel = new MessageChannel(),
  taskQueue = [];
channel.port1.onmessage = function () {
  var task = taskQueue.shift();
  task && task();
};
function scheduleWork(callback) {
  taskQueue.push(callback);
  channel.port2.postMessage(null);
}
function handleErrorInNextTick(error) {
  setTimeout(function () {
    throw error;
  });
}
var LocalPromise = Promise,
  scheduleMicrotask =
    "function" === typeof queueMicrotask
      ? queueMicrotask
      : function (callback) {
          LocalPromise.resolve(null)
            .then(callback)
            .catch(handleErrorInNextTick);
        },
  currentView = null,
  writtenBytes = 0;
function writeChunk(destination, chunk) {
  if (0 !== chunk.byteLength)
    if (2048 < chunk.byteLength)
      0 < writtenBytes &&
        (destination.enqueue(
          new Uint8Array(currentView.buffer, 0, writtenBytes)
        ),
        (currentView = new Uint8Array(2048)),
        (writtenBytes = 0)),
        destination.enqueue(chunk);
    else {
      var allowableBytes = currentView.length - writtenBytes;
      allowableBytes < chunk.byteLength &&
        (0 === allowableBytes
          ? destination.enqueue(currentView)
          : (currentView.set(chunk.subarray(0, allowableBytes), writtenBytes),
            destination.enqueue(currentView),
            (chunk = chunk.subarray(allowableBytes))),
        (currentView = new Uint8Array(2048)),
        (writtenBytes = 0));
      currentView.set(chunk, writtenBytes);
      writtenBytes += chunk.byteLength;
    }
}
function writeChunkAndReturn(destination, chunk) {
  writeChunk(destination, chunk);
  return !0;
}
function completeWriting(destination) {
  currentView &&
    0 < writtenBytes &&
    (destination.enqueue(new Uint8Array(currentView.buffer, 0, writtenBytes)),
    (currentView = null),
    (writtenBytes = 0));
}
var textEncoder = new TextEncoder();
function stringToChunk(content) {
  return textEncoder.encode(content);
}
function stringToPrecomputedChunk(content) {
  return textEncoder.encode(content);
}
function byteLengthOfChunk(chunk) {
  return chunk.byteLength;
}
function closeWithError(destination, error) {
  "function" === typeof destination.error
    ? destination.error(error)
    : destination.close();
}
var assign = Object.assign,
  hasOwnProperty = Object.prototype.hasOwnProperty,
  VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ),
  illegalAttributeNameCache = {},
  validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
    return !0;
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
    return (validatedAttributeNameCache[attributeName] = !0);
  illegalAttributeNameCache[attributeName] = !0;
  return !1;
}
var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  ),
  aliases = new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]),
  matchHtmlRegExp = /["'&<>]/;
function escapeTextForBrowser(text) {
  if (
    "boolean" === typeof text ||
    "number" === typeof text ||
    "bigint" === typeof text
  )
    return "" + text;
  text = "" + text;
  var match = matchHtmlRegExp.exec(text);
  if (match) {
    var html = "",
      index,
      lastIndex = 0;
    for (index = match.index; index < text.length; index++) {
      switch (text.charCodeAt(index)) {
        case 34:
          match = "&quot;";
          break;
        case 38:
          match = "&amp;";
          break;
        case 39:
          match = "&#x27;";
          break;
        case 60:
          match = "&lt;";
          break;
        case 62:
          match = "&gt;";
          break;
        default:
          continue;
      }
      lastIndex !== index && (html += text.slice(lastIndex, index));
      lastIndex = index + 1;
      html += match;
    }
    text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
  }
  return text;
}
var uppercasePattern = /([A-Z])/g,
  msPattern = /^ms-/,
  isJavaScriptProtocol =
    /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
function sanitizeURL(url) {
  return isJavaScriptProtocol.test("" + url)
    ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
    : url;
}
var ReactSharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  ReactDOMSharedInternals =
    ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  sharedNotPendingObject = {
    pending: !1,
    data: null,
    method: null,
    action: null
  },
  previousDispatcher = ReactDOMSharedInternals.d;
ReactDOMSharedInternals.d = {
  f: previousDispatcher.f,
  r: previousDispatcher.r,
  D: prefetchDNS,
  C: preconnect,
  L: preload,
  m: preloadModule,
  X: preinitScript,
  S: preinitStyle,
  M: preinitModuleScript
};
var PRELOAD_NO_CREDS = [],
  currentlyFlushingRenderState = null;
stringToPrecomputedChunk('"></template>');
var startInlineScript = stringToPrecomputedChunk("<script"),
  endInlineScript = stringToPrecomputedChunk("\x3c/script>"),
  startScriptSrc = stringToPrecomputedChunk('<script src="'),
  startModuleSrc = stringToPrecomputedChunk('<script type="module" src="'),
  scriptNonce = stringToPrecomputedChunk(' nonce="'),
  scriptIntegirty = stringToPrecomputedChunk(' integrity="'),
  scriptCrossOrigin = stringToPrecomputedChunk(' crossorigin="'),
  endAsyncScript = stringToPrecomputedChunk(' async="">\x3c/script>'),
  startInlineStyle = stringToPrecomputedChunk("<style"),
  scriptRegex = /(<\/|<)(s)(cript)/gi;
function scriptReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\u0073" : "\\u0053") + suffix;
}
var importMapScriptStart = stringToPrecomputedChunk(
    '<script type="importmap">'
  ),
  importMapScriptEnd = stringToPrecomputedChunk("\x3c/script>");
function createRenderState(
  resumableState,
  nonce,
  externalRuntimeConfig,
  importMap,
  onHeaders,
  maxHeadersLength
) {
  externalRuntimeConfig =
    "string" === typeof nonce ? nonce : nonce && nonce.script;
  var inlineScriptWithNonce =
      void 0 === externalRuntimeConfig
        ? startInlineScript
        : stringToPrecomputedChunk(
            '<script nonce="' +
              escapeTextForBrowser(externalRuntimeConfig) +
              '"'
          ),
    nonceStyle = "string" === typeof nonce ? void 0 : nonce && nonce.style,
    inlineStyleWithNonce =
      void 0 === nonceStyle
        ? startInlineStyle
        : stringToPrecomputedChunk(
            '<style nonce="' + escapeTextForBrowser(nonceStyle) + '"'
          ),
    idPrefix = resumableState.idPrefix,
    bootstrapChunks = [],
    bootstrapScriptContent = resumableState.bootstrapScriptContent,
    bootstrapScripts = resumableState.bootstrapScripts,
    bootstrapModules = resumableState.bootstrapModules;
  void 0 !== bootstrapScriptContent &&
    (bootstrapChunks.push(inlineScriptWithNonce),
    pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
    bootstrapChunks.push(
      endOfStartTag,
      stringToChunk(
        ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer)
      ),
      endInlineScript
    ));
  bootstrapScriptContent = [];
  void 0 !== importMap &&
    (bootstrapScriptContent.push(importMapScriptStart),
    bootstrapScriptContent.push(
      stringToChunk(
        ("" + JSON.stringify(importMap)).replace(scriptRegex, scriptReplacer)
      )
    ),
    bootstrapScriptContent.push(importMapScriptEnd));
  importMap = onHeaders
    ? {
        preconnects: "",
        fontPreloads: "",
        highImagePreloads: "",
        remainingCapacity:
          2 + ("number" === typeof maxHeadersLength ? maxHeadersLength : 2e3)
      }
    : null;
  onHeaders = {
    placeholderPrefix: stringToPrecomputedChunk(idPrefix + "P:"),
    segmentPrefix: stringToPrecomputedChunk(idPrefix + "S:"),
    boundaryPrefix: stringToPrecomputedChunk(idPrefix + "B:"),
    startInlineScript: inlineScriptWithNonce,
    startInlineStyle: inlineStyleWithNonce,
    preamble: createPreambleState(),
    externalRuntimeScript: null,
    bootstrapChunks: bootstrapChunks,
    importMapChunks: bootstrapScriptContent,
    onHeaders: onHeaders,
    headers: importMap,
    resets: {
      font: {},
      dns: {},
      connect: { default: {}, anonymous: {}, credentials: {} },
      image: {},
      style: {}
    },
    charsetChunks: [],
    viewportChunks: [],
    hoistableChunks: [],
    preconnects: new Set(),
    fontPreloads: new Set(),
    highImagePreloads: new Set(),
    styles: new Map(),
    bootstrapScripts: new Set(),
    scripts: new Set(),
    bulkPreloads: new Set(),
    preloads: {
      images: new Map(),
      stylesheets: new Map(),
      scripts: new Map(),
      moduleScripts: new Map()
    },
    nonce: { script: externalRuntimeConfig, style: nonceStyle },
    hoistableState: null,
    stylesToHoist: !1
  };
  if (void 0 !== bootstrapScripts)
    for (importMap = 0; importMap < bootstrapScripts.length; importMap++)
      (idPrefix = bootstrapScripts[importMap]),
        (nonceStyle = inlineScriptWithNonce = void 0),
        (inlineStyleWithNonce = {
          rel: "preload",
          as: "script",
          fetchPriority: "low",
          nonce: nonce
        }),
        "string" === typeof idPrefix
          ? (inlineStyleWithNonce.href = maxHeadersLength = idPrefix)
          : ((inlineStyleWithNonce.href = maxHeadersLength = idPrefix.src),
            (inlineStyleWithNonce.integrity = nonceStyle =
              "string" === typeof idPrefix.integrity
                ? idPrefix.integrity
                : void 0),
            (inlineStyleWithNonce.crossOrigin = inlineScriptWithNonce =
              "string" === typeof idPrefix || null == idPrefix.crossOrigin
                ? void 0
                : "use-credentials" === idPrefix.crossOrigin
                  ? "use-credentials"
                  : "")),
        (idPrefix = resumableState),
        (bootstrapScriptContent = maxHeadersLength),
        (idPrefix.scriptResources[bootstrapScriptContent] = null),
        (idPrefix.moduleScriptResources[bootstrapScriptContent] = null),
        (idPrefix = []),
        pushLinkImpl(idPrefix, inlineStyleWithNonce),
        onHeaders.bootstrapScripts.add(idPrefix),
        bootstrapChunks.push(
          startScriptSrc,
          stringToChunk(escapeTextForBrowser(maxHeadersLength)),
          attributeEnd
        ),
        externalRuntimeConfig &&
          bootstrapChunks.push(
            scriptNonce,
            stringToChunk(escapeTextForBrowser(externalRuntimeConfig)),
            attributeEnd
          ),
        "string" === typeof nonceStyle &&
          bootstrapChunks.push(
            scriptIntegirty,
            stringToChunk(escapeTextForBrowser(nonceStyle)),
            attributeEnd
          ),
        "string" === typeof inlineScriptWithNonce &&
          bootstrapChunks.push(
            scriptCrossOrigin,
            stringToChunk(escapeTextForBrowser(inlineScriptWithNonce)),
            attributeEnd
          ),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(endAsyncScript);
  if (void 0 !== bootstrapModules)
    for (nonce = 0; nonce < bootstrapModules.length; nonce++)
      (nonceStyle = bootstrapModules[nonce]),
        (maxHeadersLength = importMap = void 0),
        (inlineScriptWithNonce = {
          rel: "modulepreload",
          fetchPriority: "low",
          nonce: externalRuntimeConfig
        }),
        "string" === typeof nonceStyle
          ? (inlineScriptWithNonce.href = bootstrapScripts = nonceStyle)
          : ((inlineScriptWithNonce.href = bootstrapScripts = nonceStyle.src),
            (inlineScriptWithNonce.integrity = maxHeadersLength =
              "string" === typeof nonceStyle.integrity
                ? nonceStyle.integrity
                : void 0),
            (inlineScriptWithNonce.crossOrigin = importMap =
              "string" === typeof nonceStyle || null == nonceStyle.crossOrigin
                ? void 0
                : "use-credentials" === nonceStyle.crossOrigin
                  ? "use-credentials"
                  : "")),
        (nonceStyle = resumableState),
        (inlineStyleWithNonce = bootstrapScripts),
        (nonceStyle.scriptResources[inlineStyleWithNonce] = null),
        (nonceStyle.moduleScriptResources[inlineStyleWithNonce] = null),
        (nonceStyle = []),
        pushLinkImpl(nonceStyle, inlineScriptWithNonce),
        onHeaders.bootstrapScripts.add(nonceStyle),
        bootstrapChunks.push(
          startModuleSrc,
          stringToChunk(escapeTextForBrowser(bootstrapScripts)),
          attributeEnd
        ),
        externalRuntimeConfig &&
          bootstrapChunks.push(
            scriptNonce,
            stringToChunk(escapeTextForBrowser(externalRuntimeConfig)),
            attributeEnd
          ),
        "string" === typeof maxHeadersLength &&
          bootstrapChunks.push(
            scriptIntegirty,
            stringToChunk(escapeTextForBrowser(maxHeadersLength)),
            attributeEnd
          ),
        "string" === typeof importMap &&
          bootstrapChunks.push(
            scriptCrossOrigin,
            stringToChunk(escapeTextForBrowser(importMap)),
            attributeEnd
          ),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(endAsyncScript);
  return onHeaders;
}
function createResumableState(
  identifierPrefix,
  externalRuntimeConfig,
  bootstrapScriptContent,
  bootstrapScripts,
  bootstrapModules
) {
  return {
    idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
    nextFormID: 0,
    streamingFormat: 0,
    bootstrapScriptContent: bootstrapScriptContent,
    bootstrapScripts: bootstrapScripts,
    bootstrapModules: bootstrapModules,
    instructions: 0,
    hasBody: !1,
    hasHtml: !1,
    unknownResources: {},
    dnsResources: {},
    connectResources: { default: {}, anonymous: {}, credentials: {} },
    imageResources: {},
    styleResources: {},
    scriptResources: {},
    moduleUnknownResources: {},
    moduleScriptResources: {}
  };
}
function createPreambleState() {
  return { htmlChunks: null, headChunks: null, bodyChunks: null };
}
function createFormatContext(
  insertionMode,
  selectedValue,
  tagScope,
  viewTransition
) {
  return {
    insertionMode: insertionMode,
    selectedValue: selectedValue,
    tagScope: tagScope,
    viewTransition: viewTransition
  };
}
function createRootFormatContext(namespaceURI) {
  return createFormatContext(
    "http://www.w3.org/2000/svg" === namespaceURI
      ? 4
      : "http://www.w3.org/1998/Math/MathML" === namespaceURI
        ? 5
        : 0,
    null,
    0,
    null
  );
}
function getChildFormatContext(parentContext, type, props) {
  var subtreeScope = parentContext.tagScope & -25;
  switch (type) {
    case "noscript":
      return createFormatContext(2, null, subtreeScope | 1, null);
    case "select":
      return createFormatContext(
        2,
        null != props.value ? props.value : props.defaultValue,
        subtreeScope,
        null
      );
    case "svg":
      return createFormatContext(4, null, subtreeScope, null);
    case "picture":
      return createFormatContext(2, null, subtreeScope | 2, null);
    case "math":
      return createFormatContext(5, null, subtreeScope, null);
    case "foreignObject":
      return createFormatContext(2, null, subtreeScope, null);
    case "table":
      return createFormatContext(6, null, subtreeScope, null);
    case "thead":
    case "tbody":
    case "tfoot":
      return createFormatContext(7, null, subtreeScope, null);
    case "colgroup":
      return createFormatContext(9, null, subtreeScope, null);
    case "tr":
      return createFormatContext(8, null, subtreeScope, null);
    case "head":
      if (2 > parentContext.insertionMode)
        return createFormatContext(3, null, subtreeScope, null);
      break;
    case "html":
      if (0 === parentContext.insertionMode)
        return createFormatContext(1, null, subtreeScope, null);
  }
  return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode
    ? createFormatContext(2, null, subtreeScope, null)
    : parentContext.tagScope !== subtreeScope
      ? createFormatContext(
          parentContext.insertionMode,
          parentContext.selectedValue,
          subtreeScope,
          null
        )
      : parentContext;
}
function getSuspenseViewTransition(parentViewTransition) {
  return null === parentViewTransition
    ? null
    : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
}
function getSuspenseFallbackFormatContext(resumableState, parentContext) {
  parentContext.tagScope & 32 && (resumableState.instructions |= 128);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    parentContext.tagScope | 12,
    getSuspenseViewTransition(parentContext.viewTransition)
  );
}
function getSuspenseContentFormatContext(resumableState, parentContext) {
  resumableState = getSuspenseViewTransition(parentContext.viewTransition);
  var subtreeScope = parentContext.tagScope | 16;
  null !== resumableState &&
    "none" !== resumableState.share &&
    (subtreeScope |= 64);
  return createFormatContext(
    parentContext.insertionMode,
    parentContext.selectedValue,
    subtreeScope,
    resumableState
  );
}
var textSeparator = stringToPrecomputedChunk("\x3c!-- --\x3e");
function pushTextInstance(target, text, renderState, textEmbedded) {
  if ("" === text) return textEmbedded;
  textEmbedded && target.push(textSeparator);
  target.push(stringToChunk(escapeTextForBrowser(text)));
  return !0;
}
var styleNameCache = new Map(),
  styleAttributeStart = stringToPrecomputedChunk(' style="'),
  styleAssign = stringToPrecomputedChunk(":"),
  styleSeparator = stringToPrecomputedChunk(";");
function pushStyleAttribute(target, style) {
  if ("object" !== typeof style) throw Error(formatProdErrorMessage(62));
  var isFirst = !0,
    styleName;
  for (styleName in style)
    if (hasOwnProperty.call(style, styleName)) {
      var styleValue = style[styleName];
      if (
        null != styleValue &&
        "boolean" !== typeof styleValue &&
        "" !== styleValue
      ) {
        if (0 === styleName.indexOf("--")) {
          var nameChunk = stringToChunk(escapeTextForBrowser(styleName));
          styleValue = stringToChunk(
            escapeTextForBrowser(("" + styleValue).trim())
          );
        } else
          (nameChunk = styleNameCache.get(styleName)),
            void 0 === nameChunk &&
              ((nameChunk = stringToPrecomputedChunk(
                escapeTextForBrowser(
                  styleName
                    .replace(uppercasePattern, "-$1")
                    .toLowerCase()
                    .replace(msPattern, "-ms-")
                )
              )),
              styleNameCache.set(styleName, nameChunk)),
            (styleValue =
              "number" === typeof styleValue
                ? 0 === styleValue || unitlessNumbers.has(styleName)
                  ? stringToChunk("" + styleValue)
                  : stringToChunk(styleValue + "px")
                : stringToChunk(
                    escapeTextForBrowser(("" + styleValue).trim())
                  ));
        isFirst
          ? ((isFirst = !1),
            target.push(
              styleAttributeStart,
              nameChunk,
              styleAssign,
              styleValue
            ))
          : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
      }
    }
  isFirst || target.push(attributeEnd);
}
var attributeSeparator = stringToPrecomputedChunk(" "),
  attributeAssign = stringToPrecomputedChunk('="'),
  attributeEnd = stringToPrecomputedChunk('"'),
  attributeEmptyString = stringToPrecomputedChunk('=""');
function pushBooleanAttribute(target, name, value) {
  value &&
    "function" !== typeof value &&
    "symbol" !== typeof value &&
    target.push(attributeSeparator, stringToChunk(name), attributeEmptyString);
}
function pushStringAttribute(target, name, value) {
  "function" !== typeof value &&
    "symbol" !== typeof value &&
    "boolean" !== typeof value &&
    target.push(
      attributeSeparator,
      stringToChunk(name),
      attributeAssign,
      stringToChunk(escapeTextForBrowser(value)),
      attributeEnd
    );
}
var actionJavaScriptURL = stringToPrecomputedChunk(
    escapeTextForBrowser(
      "javascript:throw new Error('React form unexpectedly submitted.')"
    )
  ),
  startHiddenInputChunk = stringToPrecomputedChunk('<input type="hidden"');
function pushAdditionalFormField(value, key) {
  this.push(startHiddenInputChunk);
  validateAdditionalFormField(value);
  pushStringAttribute(this, "name", key);
  pushStringAttribute(this, "value", value);
  this.push(endOfStartTagSelfClosing);
}
function validateAdditionalFormField(value) {
  if ("string" !== typeof value) throw Error(formatProdErrorMessage(480));
}
function getCustomFormFields(resumableState, formAction) {
  if ("function" === typeof formAction.$$FORM_ACTION) {
    var id = resumableState.nextFormID++;
    resumableState = resumableState.idPrefix + id;
    try {
      var customFields = formAction.$$FORM_ACTION(resumableState);
      if (customFields) {
        var formData = customFields.data;
        null != formData && formData.forEach(validateAdditionalFormField);
      }
      return customFields;
    } catch (x) {
      if ("object" === typeof x && null !== x && "function" === typeof x.then)
        throw x;
    }
  }
  return null;
}
function pushFormActionAttribute(
  target,
  resumableState,
  renderState,
  formAction,
  formEncType,
  formMethod,
  formTarget,
  name
) {
  var formData = null;
  if ("function" === typeof formAction) {
    var customFields = getCustomFormFields(resumableState, formAction);
    null !== customFields
      ? ((name = customFields.name),
        (formAction = customFields.action || ""),
        (formEncType = customFields.encType),
        (formMethod = customFields.method),
        (formTarget = customFields.target),
        (formData = customFields.data))
      : (target.push(
          attributeSeparator,
          stringToChunk("formAction"),
          attributeAssign,
          actionJavaScriptURL,
          attributeEnd
        ),
        (formTarget = formMethod = formEncType = formAction = name = null),
        injectFormReplayingRuntime(resumableState, renderState));
  }
  null != name && pushAttribute(target, "name", name);
  null != formAction && pushAttribute(target, "formAction", formAction);
  null != formEncType && pushAttribute(target, "formEncType", formEncType);
  null != formMethod && pushAttribute(target, "formMethod", formMethod);
  null != formTarget && pushAttribute(target, "formTarget", formTarget);
  return formData;
}
function pushAttribute(target, name, value) {
  switch (name) {
    case "className":
      pushStringAttribute(target, "class", value);
      break;
    case "tabIndex":
      pushStringAttribute(target, "tabindex", value);
      break;
    case "dir":
    case "role":
    case "viewBox":
    case "width":
    case "height":
      pushStringAttribute(target, name, value);
      break;
    case "style":
      pushStyleAttribute(target, value);
      break;
    case "src":
    case "href":
      if ("" === value) break;
    case "action":
    case "formAction":
      if (
        null == value ||
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(
        attributeSeparator,
        stringToChunk(name),
        attributeAssign,
        stringToChunk(escapeTextForBrowser(value)),
        attributeEnd
      );
      break;
    case "defaultValue":
    case "defaultChecked":
    case "innerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "ref":
      break;
    case "autoFocus":
    case "multiple":
    case "muted":
      pushBooleanAttribute(target, name.toLowerCase(), value);
      break;
    case "xlinkHref":
      if (
        "function" === typeof value ||
        "symbol" === typeof value ||
        "boolean" === typeof value
      )
        break;
      value = sanitizeURL("" + value);
      target.push(
        attributeSeparator,
        stringToChunk("xlink:href"),
        attributeAssign,
        stringToChunk(escapeTextForBrowser(value)),
        attributeEnd
      );
      break;
    case "contentEditable":
    case "spellCheck":
    case "draggable":
    case "value":
    case "autoReverse":
    case "externalResourcesRequired":
    case "focusable":
    case "preserveAlpha":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd
        );
      break;
    case "inert":
    case "allowFullScreen":
    case "async":
    case "autoPlay":
    case "controls":
    case "default":
    case "defer":
    case "disabled":
    case "disablePictureInPicture":
    case "disableRemotePlayback":
    case "formNoValidate":
    case "hidden":
    case "loop":
    case "noModule":
    case "noValidate":
    case "open":
    case "playsInline":
    case "readOnly":
    case "required":
    case "reversed":
    case "scoped":
    case "seamless":
    case "itemScope":
      value &&
        "function" !== typeof value &&
        "symbol" !== typeof value &&
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeEmptyString
        );
      break;
    case "capture":
    case "download":
      !0 === value
        ? target.push(
            attributeSeparator,
            stringToChunk(name),
            attributeEmptyString
          )
        : !1 !== value &&
          "function" !== typeof value &&
          "symbol" !== typeof value &&
          target.push(
            attributeSeparator,
            stringToChunk(name),
            attributeAssign,
            stringToChunk(escapeTextForBrowser(value)),
            attributeEnd
          );
      break;
    case "cols":
    case "rows":
    case "size":
    case "span":
      "function" !== typeof value &&
        "symbol" !== typeof value &&
        !isNaN(value) &&
        1 <= value &&
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd
        );
      break;
    case "rowSpan":
    case "start":
      "function" === typeof value ||
        "symbol" === typeof value ||
        isNaN(value) ||
        target.push(
          attributeSeparator,
          stringToChunk(name),
          attributeAssign,
          stringToChunk(escapeTextForBrowser(value)),
          attributeEnd
        );
      break;
    case "xlinkActuate":
      pushStringAttribute(target, "xlink:actuate", value);
      break;
    case "xlinkArcrole":
      pushStringAttribute(target, "xlink:arcrole", value);
      break;
    case "xlinkRole":
      pushStringAttribute(target, "xlink:role", value);
      break;
    case "xlinkShow":
      pushStringAttribute(target, "xlink:show", value);
      break;
    case "xlinkTitle":
      pushStringAttribute(target, "xlink:title", value);
      break;
    case "xlinkType":
      pushStringAttribute(target, "xlink:type", value);
      break;
    case "xmlBase":
      pushStringAttribute(target, "xml:base", value);
      break;
    case "xmlLang":
      pushStringAttribute(target, "xml:lang", value);
      break;
    case "xmlSpace":
      pushStringAttribute(target, "xml:space", value);
      break;
    default:
      if (
        !(2 < name.length) ||
        ("o" !== name[0] && "O" !== name[0]) ||
        ("n" !== name[1] && "N" !== name[1])
      )
        if (((name = aliases.get(name) || name), isAttributeNameSafe(name))) {
          switch (typeof value) {
            case "function":
            case "symbol":
              return;
            case "boolean":
              var prefix$8 = name.toLowerCase().slice(0, 5);
              if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
          }
          target.push(
            attributeSeparator,
            stringToChunk(name),
            attributeAssign,
            stringToChunk(escapeTextForBrowser(value)),
            attributeEnd
          );
        }
  }
}
var endOfStartTag = stringToPrecomputedChunk(">"),
  endOfStartTagSelfClosing = stringToPrecomputedChunk("/>");
function pushInnerHTML(target, innerHTML, children) {
  if (null != innerHTML) {
    if (null != children) throw Error(formatProdErrorMessage(60));
    if ("object" !== typeof innerHTML || !("__html" in innerHTML))
      throw Error(formatProdErrorMessage(61));
    innerHTML = innerHTML.__html;
    null !== innerHTML &&
      void 0 !== innerHTML &&
      target.push(stringToChunk("" + innerHTML));
  }
}
function flattenOptionChildren(children) {
  var content = "";
  React.Children.forEach(children, function (child) {
    null != child && (content += child);
  });
  return content;
}
var selectedMarkerAttribute = stringToPrecomputedChunk(' selected=""'),
  formReplayingRuntimeScript = stringToPrecomputedChunk(
    'addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error(\'React form unexpectedly submitted.\')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});'
  );
function injectFormReplayingRuntime(resumableState, renderState) {
  if (0 === (resumableState.instructions & 16)) {
    resumableState.instructions |= 16;
    var preamble = renderState.preamble,
      bootstrapChunks = renderState.bootstrapChunks;
    (preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length
      ? (bootstrapChunks.push(renderState.startInlineScript),
        pushCompletedShellIdAttribute(bootstrapChunks, resumableState),
        bootstrapChunks.push(
          endOfStartTag,
          formReplayingRuntimeScript,
          endInlineScript
        ))
      : bootstrapChunks.unshift(
          renderState.startInlineScript,
          endOfStartTag,
          formReplayingRuntimeScript,
          endInlineScript
        );
  }
}
var formStateMarkerIsMatching = stringToPrecomputedChunk("\x3c!--F!--\x3e"),
  formStateMarkerIsNotMatching = stringToPrecomputedChunk("\x3c!--F--\x3e");
function pushLinkImpl(target, props) {
  target.push(startChunkForTag("link"));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, "link"));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTagSelfClosing);
  return null;
}
var styleRegex = /(<\/|<)(s)(tyle)/gi;
function styleReplacer(match, prefix, s, suffix) {
  return "" + prefix + ("s" === s ? "\\73 " : "\\53 ") + suffix;
}
function pushSelfClosing(target, props, tag) {
  target.push(startChunkForTag(tag));
  for (var propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
          case "dangerouslySetInnerHTML":
            throw Error(formatProdErrorMessage(399, tag));
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTagSelfClosing);
  return null;
}
function pushTitleImpl(target, props) {
  target.push(startChunkForTag("title"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTag);
  props = Array.isArray(children)
    ? 2 > children.length
      ? children[0]
      : null
    : children;
  "function" !== typeof props &&
    "symbol" !== typeof props &&
    null !== props &&
    void 0 !== props &&
    target.push(stringToChunk(escapeTextForBrowser("" + props)));
  pushInnerHTML(target, innerHTML, children);
  target.push(endChunkForTag("title"));
  return null;
}
var headPreambleContributionChunk =
    stringToPrecomputedChunk("\x3c!--head--\x3e"),
  bodyPreambleContributionChunk = stringToPrecomputedChunk("\x3c!--body--\x3e"),
  htmlPreambleContributionChunk = stringToPrecomputedChunk("\x3c!--html--\x3e");
function pushScriptImpl(target, props) {
  target.push(startChunkForTag("script"));
  var children = null,
    innerHTML = null,
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            children = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, children);
  "string" === typeof children &&
    target.push(
      stringToChunk(("" + children).replace(scriptRegex, scriptReplacer))
    );
  target.push(endChunkForTag("script"));
  return null;
}
function pushStartSingletonElement(target, props, tag) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, tag);
  return tag;
}
function pushStartGenericElement(target, props, tag) {
  target.push(startChunkForTag(tag));
  var innerHTML = (tag = null),
    propKey;
  for (propKey in props)
    if (hasOwnProperty.call(props, propKey)) {
      var propValue = props[propKey];
      if (null != propValue)
        switch (propKey) {
          case "children":
            tag = propValue;
            break;
          case "dangerouslySetInnerHTML":
            innerHTML = propValue;
            break;
          default:
            pushAttribute(target, propKey, propValue);
        }
    }
  target.push(endOfStartTag);
  pushInnerHTML(target, innerHTML, tag);
  return "string" === typeof tag
    ? (target.push(stringToChunk(escapeTextForBrowser(tag))), null)
    : tag;
}
var leadingNewline = stringToPrecomputedChunk("\n"),
  VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,
  validatedTagCache = new Map();
function startChunkForTag(tag) {
  var tagStartChunk = validatedTagCache.get(tag);
  if (void 0 === tagStartChunk) {
    if (!VALID_TAG_REGEX.test(tag))
      throw Error(formatProdErrorMessage(65, tag));
    tagStartChunk = stringToPrecomputedChunk("<" + tag);
    validatedTagCache.set(tag, tagStartChunk);
  }
  return tagStartChunk;
}
var doctypeChunk = stringToPrecomputedChunk("<!DOCTYPE html>");
function pushStartInstance(
  target$jscomp$0,
  type,
  props,
  resumableState,
  renderState,
  preambleState,
  hoistableState,
  formatContext,
  textEmbedded
) {
  switch (type) {
    case "div":
    case "span":
    case "svg":
    case "path":
      break;
    case "a":
      target$jscomp$0.push(startChunkForTag("a"));
      var children = null,
        innerHTML = null,
        propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              case "href":
                "" === propValue
                  ? pushStringAttribute(target$jscomp$0, "href", "")
                  : pushAttribute(target$jscomp$0, propKey, propValue);
                break;
              default:
                pushAttribute(target$jscomp$0, propKey, propValue);
            }
        }
      target$jscomp$0.push(endOfStartTag);
      pushInnerHTML(target$jscomp$0, innerHTML, children);
      if ("string" === typeof children) {
        target$jscomp$0.push(stringToChunk(escapeTextForBrowser(children)));
        var JSCompiler_inline_result = null;
      } else JSCompiler_inline_result = children;
      return JSCompiler_inline_result;
    case "g":
    case "p":
    case "li":
      break;
    case "select":
      target$jscomp$0.push(startChunkForTag("select"));
      var children$jscomp$0 = null,
        innerHTML$jscomp$0 = null,
        propKey$jscomp$0;
      for (propKey$jscomp$0 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$0)) {
          var propValue$jscomp$0 = props[propKey$jscomp$0];
          if (null != propValue$jscomp$0)
            switch (propKey$jscomp$0) {
              case "children":
                children$jscomp$0 = propValue$jscomp$0;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$0 = propValue$jscomp$0;
                break;
              case "defaultValue":
              case "value":
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$0,
                  propValue$jscomp$0
                );
            }
        }
      target$jscomp$0.push(endOfStartTag);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
      return children$jscomp$0;
    case "option":
      var selectedValue = formatContext.selectedValue;
      target$jscomp$0.push(startChunkForTag("option"));
      var children$jscomp$1 = null,
        value = null,
        selected = null,
        innerHTML$jscomp$1 = null,
        propKey$jscomp$1;
      for (propKey$jscomp$1 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$1)) {
          var propValue$jscomp$1 = props[propKey$jscomp$1];
          if (null != propValue$jscomp$1)
            switch (propKey$jscomp$1) {
              case "children":
                children$jscomp$1 = propValue$jscomp$1;
                break;
              case "selected":
                selected = propValue$jscomp$1;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$1 = propValue$jscomp$1;
                break;
              case "value":
                value = propValue$jscomp$1;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$1,
                  propValue$jscomp$1
                );
            }
        }
      if (null != selectedValue) {
        var stringValue =
          null !== value
            ? "" + value
            : flattenOptionChildren(children$jscomp$1);
        if (isArrayImpl(selectedValue))
          for (var i = 0; i < selectedValue.length; i++) {
            if ("" + selectedValue[i] === stringValue) {
              target$jscomp$0.push(selectedMarkerAttribute);
              break;
            }
          }
        else
          "" + selectedValue === stringValue &&
            target$jscomp$0.push(selectedMarkerAttribute);
      } else selected && target$jscomp$0.push(selectedMarkerAttribute);
      target$jscomp$0.push(endOfStartTag);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
      return children$jscomp$1;
    case "textarea":
      target$jscomp$0.push(startChunkForTag("textarea"));
      var value$jscomp$0 = null,
        defaultValue = null,
        children$jscomp$2 = null,
        propKey$jscomp$2;
      for (propKey$jscomp$2 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$2)) {
          var propValue$jscomp$2 = props[propKey$jscomp$2];
          if (null != propValue$jscomp$2)
            switch (propKey$jscomp$2) {
              case "children":
                children$jscomp$2 = propValue$jscomp$2;
                break;
              case "value":
                value$jscomp$0 = propValue$jscomp$2;
                break;
              case "defaultValue":
                defaultValue = propValue$jscomp$2;
                break;
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(91));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$2,
                  propValue$jscomp$2
                );
            }
        }
      null === value$jscomp$0 &&
        null !== defaultValue &&
        (value$jscomp$0 = defaultValue);
      target$jscomp$0.push(endOfStartTag);
      if (null != children$jscomp$2) {
        if (null != value$jscomp$0) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children$jscomp$2)) {
          if (1 < children$jscomp$2.length)
            throw Error(formatProdErrorMessage(93));
          value$jscomp$0 = "" + children$jscomp$2[0];
        }
        value$jscomp$0 = "" + children$jscomp$2;
      }
      "string" === typeof value$jscomp$0 &&
        "\n" === value$jscomp$0[0] &&
        target$jscomp$0.push(leadingNewline);
      null !== value$jscomp$0 &&
        target$jscomp$0.push(
          stringToChunk(escapeTextForBrowser("" + value$jscomp$0))
        );
      return null;
    case "input":
      target$jscomp$0.push(startChunkForTag("input"));
      var name = null,
        formAction = null,
        formEncType = null,
        formMethod = null,
        formTarget = null,
        value$jscomp$1 = null,
        defaultValue$jscomp$0 = null,
        checked = null,
        defaultChecked = null,
        propKey$jscomp$3;
      for (propKey$jscomp$3 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$3)) {
          var propValue$jscomp$3 = props[propKey$jscomp$3];
          if (null != propValue$jscomp$3)
            switch (propKey$jscomp$3) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "input"));
              case "name":
                name = propValue$jscomp$3;
                break;
              case "formAction":
                formAction = propValue$jscomp$3;
                break;
              case "formEncType":
                formEncType = propValue$jscomp$3;
                break;
              case "formMethod":
                formMethod = propValue$jscomp$3;
                break;
              case "formTarget":
                formTarget = propValue$jscomp$3;
                break;
              case "defaultChecked":
                defaultChecked = propValue$jscomp$3;
                break;
              case "defaultValue":
                defaultValue$jscomp$0 = propValue$jscomp$3;
                break;
              case "checked":
                checked = propValue$jscomp$3;
                break;
              case "value":
                value$jscomp$1 = propValue$jscomp$3;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$3,
                  propValue$jscomp$3
                );
            }
        }
      var formData = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction,
        formEncType,
        formMethod,
        formTarget,
        name
      );
      null !== checked
        ? pushBooleanAttribute(target$jscomp$0, "checked", checked)
        : null !== defaultChecked &&
          pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
      null !== value$jscomp$1
        ? pushAttribute(target$jscomp$0, "value", value$jscomp$1)
        : null !== defaultValue$jscomp$0 &&
          pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
      target$jscomp$0.push(endOfStartTagSelfClosing);
      null != formData &&
        formData.forEach(pushAdditionalFormField, target$jscomp$0);
      return null;
    case "button":
      target$jscomp$0.push(startChunkForTag("button"));
      var children$jscomp$3 = null,
        innerHTML$jscomp$2 = null,
        name$jscomp$0 = null,
        formAction$jscomp$0 = null,
        formEncType$jscomp$0 = null,
        formMethod$jscomp$0 = null,
        formTarget$jscomp$0 = null,
        propKey$jscomp$4;
      for (propKey$jscomp$4 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$4)) {
          var propValue$jscomp$4 = props[propKey$jscomp$4];
          if (null != propValue$jscomp$4)
            switch (propKey$jscomp$4) {
              case "children":
                children$jscomp$3 = propValue$jscomp$4;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$2 = propValue$jscomp$4;
                break;
              case "name":
                name$jscomp$0 = propValue$jscomp$4;
                break;
              case "formAction":
                formAction$jscomp$0 = propValue$jscomp$4;
                break;
              case "formEncType":
                formEncType$jscomp$0 = propValue$jscomp$4;
                break;
              case "formMethod":
                formMethod$jscomp$0 = propValue$jscomp$4;
                break;
              case "formTarget":
                formTarget$jscomp$0 = propValue$jscomp$4;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$4,
                  propValue$jscomp$4
                );
            }
        }
      var formData$jscomp$0 = pushFormActionAttribute(
        target$jscomp$0,
        resumableState,
        renderState,
        formAction$jscomp$0,
        formEncType$jscomp$0,
        formMethod$jscomp$0,
        formTarget$jscomp$0,
        name$jscomp$0
      );
      target$jscomp$0.push(endOfStartTag);
      null != formData$jscomp$0 &&
        formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
      if ("string" === typeof children$jscomp$3) {
        target$jscomp$0.push(
          stringToChunk(escapeTextForBrowser(children$jscomp$3))
        );
        var JSCompiler_inline_result$jscomp$0 = null;
      } else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
      return JSCompiler_inline_result$jscomp$0;
    case "form":
      target$jscomp$0.push(startChunkForTag("form"));
      var children$jscomp$4 = null,
        innerHTML$jscomp$3 = null,
        formAction$jscomp$1 = null,
        formEncType$jscomp$1 = null,
        formMethod$jscomp$1 = null,
        formTarget$jscomp$1 = null,
        propKey$jscomp$5;
      for (propKey$jscomp$5 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$5)) {
          var propValue$jscomp$5 = props[propKey$jscomp$5];
          if (null != propValue$jscomp$5)
            switch (propKey$jscomp$5) {
              case "children":
                children$jscomp$4 = propValue$jscomp$5;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$3 = propValue$jscomp$5;
                break;
              case "action":
                formAction$jscomp$1 = propValue$jscomp$5;
                break;
              case "encType":
                formEncType$jscomp$1 = propValue$jscomp$5;
                break;
              case "method":
                formMethod$jscomp$1 = propValue$jscomp$5;
                break;
              case "target":
                formTarget$jscomp$1 = propValue$jscomp$5;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$5,
                  propValue$jscomp$5
                );
            }
        }
      var formData$jscomp$1 = null,
        formActionName = null;
      if ("function" === typeof formAction$jscomp$1) {
        var customFields = getCustomFormFields(
          resumableState,
          formAction$jscomp$1
        );
        null !== customFields
          ? ((formAction$jscomp$1 = customFields.action || ""),
            (formEncType$jscomp$1 = customFields.encType),
            (formMethod$jscomp$1 = customFields.method),
            (formTarget$jscomp$1 = customFields.target),
            (formData$jscomp$1 = customFields.data),
            (formActionName = customFields.name))
          : (target$jscomp$0.push(
              attributeSeparator,
              stringToChunk("action"),
              attributeAssign,
              actionJavaScriptURL,
              attributeEnd
            ),
            (formTarget$jscomp$1 =
              formMethod$jscomp$1 =
              formEncType$jscomp$1 =
              formAction$jscomp$1 =
                null),
            injectFormReplayingRuntime(resumableState, renderState));
      }
      null != formAction$jscomp$1 &&
        pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
      null != formEncType$jscomp$1 &&
        pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
      null != formMethod$jscomp$1 &&
        pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
      null != formTarget$jscomp$1 &&
        pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
      target$jscomp$0.push(endOfStartTag);
      null !== formActionName &&
        (target$jscomp$0.push(startHiddenInputChunk),
        pushStringAttribute(target$jscomp$0, "name", formActionName),
        target$jscomp$0.push(endOfStartTagSelfClosing),
        null != formData$jscomp$1 &&
          formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
      if ("string" === typeof children$jscomp$4) {
        target$jscomp$0.push(
          stringToChunk(escapeTextForBrowser(children$jscomp$4))
        );
        var JSCompiler_inline_result$jscomp$1 = null;
      } else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
      return JSCompiler_inline_result$jscomp$1;
    case "menuitem":
      target$jscomp$0.push(startChunkForTag("menuitem"));
      for (var propKey$jscomp$6 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$6)) {
          var propValue$jscomp$6 = props[propKey$jscomp$6];
          if (null != propValue$jscomp$6)
            switch (propKey$jscomp$6) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(400));
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$6,
                  propValue$jscomp$6
                );
            }
        }
      target$jscomp$0.push(endOfStartTag);
      return null;
    case "object":
      target$jscomp$0.push(startChunkForTag("object"));
      var children$jscomp$5 = null,
        innerHTML$jscomp$4 = null,
        propKey$jscomp$7;
      for (propKey$jscomp$7 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$7)) {
          var propValue$jscomp$7 = props[propKey$jscomp$7];
          if (null != propValue$jscomp$7)
            switch (propKey$jscomp$7) {
              case "children":
                children$jscomp$5 = propValue$jscomp$7;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$4 = propValue$jscomp$7;
                break;
              case "data":
                var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                if ("" === sanitizedValue) break;
                target$jscomp$0.push(
                  attributeSeparator,
                  stringToChunk("data"),
                  attributeAssign,
                  stringToChunk(escapeTextForBrowser(sanitizedValue)),
                  attributeEnd
                );
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$7,
                  propValue$jscomp$7
                );
            }
        }
      target$jscomp$0.push(endOfStartTag);
      pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
      if ("string" === typeof children$jscomp$5) {
        target$jscomp$0.push(
          stringToChunk(escapeTextForBrowser(children$jscomp$5))
        );
        var JSCompiler_inline_result$jscomp$2 = null;
      } else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
      return JSCompiler_inline_result$jscomp$2;
    case "title":
      var noscriptTagInScope = formatContext.tagScope & 1,
        isFallback = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(
          target$jscomp$0,
          props
        );
      else
        isFallback
          ? (JSCompiler_inline_result$jscomp$3 = null)
          : (pushTitleImpl(renderState.hoistableChunks, props),
            (JSCompiler_inline_result$jscomp$3 = void 0));
      return JSCompiler_inline_result$jscomp$3;
    case "link":
      var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1,
        isFallback$jscomp$0 = formatContext.tagScope & 4,
        rel = props.rel,
        href = props.href,
        precedence = props.precedence;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$0 ||
        null != props.itemProp ||
        "string" !== typeof rel ||
        "string" !== typeof href ||
        "" === href
      ) {
        pushLinkImpl(target$jscomp$0, props);
        var JSCompiler_inline_result$jscomp$4 = null;
      } else if ("stylesheet" === props.rel)
        if (
          "string" !== typeof precedence ||
          null != props.disabled ||
          props.onLoad ||
          props.onError
        )
          JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
            target$jscomp$0,
            props
          );
        else {
          var styleQueue = renderState.styles.get(precedence),
            resourceState = resumableState.styleResources.hasOwnProperty(href)
              ? resumableState.styleResources[href]
              : void 0;
          if (null !== resourceState) {
            resumableState.styleResources[href] = null;
            styleQueue ||
              ((styleQueue = {
                precedence: stringToChunk(escapeTextForBrowser(precedence)),
                rules: [],
                hrefs: [],
                sheets: new Map()
              }),
              renderState.styles.set(precedence, styleQueue));
            var resource = {
              state: 0,
              props: assign({}, props, {
                "data-precedence": props.precedence,
                precedence: null
              })
            };
            if (resourceState) {
              2 === resourceState.length &&
                adoptPreloadCredentials(resource.props, resourceState);
              var preloadResource = renderState.preloads.stylesheets.get(href);
              preloadResource && 0 < preloadResource.length
                ? (preloadResource.length = 0)
                : (resource.state = 1);
            }
            styleQueue.sheets.set(href, resource);
            hoistableState && hoistableState.stylesheets.add(resource);
          } else if (styleQueue) {
            var resource$9 = styleQueue.sheets.get(href);
            resource$9 &&
              hoistableState &&
              hoistableState.stylesheets.add(resource$9);
          }
          textEmbedded && target$jscomp$0.push(textSeparator);
          JSCompiler_inline_result$jscomp$4 = null;
        }
      else
        props.onLoad || props.onError
          ? (JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
              target$jscomp$0,
              props
            ))
          : (textEmbedded && target$jscomp$0.push(textSeparator),
            (JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0
              ? null
              : pushLinkImpl(renderState.hoistableChunks, props)));
      return JSCompiler_inline_result$jscomp$4;
    case "script":
      var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1,
        asyncProp = props.async;
      if (
        "string" !== typeof props.src ||
        !props.src ||
        !asyncProp ||
        "function" === typeof asyncProp ||
        "symbol" === typeof asyncProp ||
        props.onLoad ||
        props.onError ||
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$1 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(
          target$jscomp$0,
          props
        );
      else {
        var key = props.src;
        if ("module" === props.type) {
          var resources = resumableState.moduleScriptResources;
          var preloads = renderState.preloads.moduleScripts;
        } else
          (resources = resumableState.scriptResources),
            (preloads = renderState.preloads.scripts);
        var resourceState$jscomp$0 = resources.hasOwnProperty(key)
          ? resources[key]
          : void 0;
        if (null !== resourceState$jscomp$0) {
          resources[key] = null;
          var scriptProps = props;
          if (resourceState$jscomp$0) {
            2 === resourceState$jscomp$0.length &&
              ((scriptProps = assign({}, props)),
              adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
            var preloadResource$jscomp$0 = preloads.get(key);
            preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
          }
          var resource$jscomp$0 = [];
          renderState.scripts.add(resource$jscomp$0);
          pushScriptImpl(resource$jscomp$0, scriptProps);
        }
        textEmbedded && target$jscomp$0.push(textSeparator);
        JSCompiler_inline_result$jscomp$5 = null;
      }
      return JSCompiler_inline_result$jscomp$5;
    case "style":
      var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1,
        precedence$jscomp$0 = props.precedence,
        href$jscomp$0 = props.href,
        nonce = props.nonce;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$2 ||
        null != props.itemProp ||
        "string" !== typeof precedence$jscomp$0 ||
        "string" !== typeof href$jscomp$0 ||
        "" === href$jscomp$0
      ) {
        target$jscomp$0.push(startChunkForTag("style"));
        var children$jscomp$6 = null,
          innerHTML$jscomp$5 = null,
          propKey$jscomp$8;
        for (propKey$jscomp$8 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$8)) {
            var propValue$jscomp$8 = props[propKey$jscomp$8];
            if (null != propValue$jscomp$8)
              switch (propKey$jscomp$8) {
                case "children":
                  children$jscomp$6 = propValue$jscomp$8;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$5 = propValue$jscomp$8;
                  break;
                default:
                  pushAttribute(
                    target$jscomp$0,
                    propKey$jscomp$8,
                    propValue$jscomp$8
                  );
              }
          }
        target$jscomp$0.push(endOfStartTag);
        var child = Array.isArray(children$jscomp$6)
          ? 2 > children$jscomp$6.length
            ? children$jscomp$6[0]
            : null
          : children$jscomp$6;
        "function" !== typeof child &&
          "symbol" !== typeof child &&
          null !== child &&
          void 0 !== child &&
          target$jscomp$0.push(
            stringToChunk(("" + child).replace(styleRegex, styleReplacer))
          );
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
        target$jscomp$0.push(endChunkForTag("style"));
        var JSCompiler_inline_result$jscomp$6 = null;
      } else {
        var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
        if (
          null !==
          (resumableState.styleResources.hasOwnProperty(href$jscomp$0)
            ? resumableState.styleResources[href$jscomp$0]
            : void 0)
        ) {
          resumableState.styleResources[href$jscomp$0] = null;
          styleQueue$jscomp$0 ||
            ((styleQueue$jscomp$0 = {
              precedence: stringToChunk(
                escapeTextForBrowser(precedence$jscomp$0)
              ),
              rules: [],
              hrefs: [],
              sheets: new Map()
            }),
            renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
          var nonceStyle = renderState.nonce.style;
          if (!nonceStyle || nonceStyle === nonce) {
            styleQueue$jscomp$0.hrefs.push(
              stringToChunk(escapeTextForBrowser(href$jscomp$0))
            );
            var target = styleQueue$jscomp$0.rules,
              children$jscomp$7 = null,
              innerHTML$jscomp$6 = null,
              propKey$jscomp$9;
            for (propKey$jscomp$9 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                var propValue$jscomp$9 = props[propKey$jscomp$9];
                if (null != propValue$jscomp$9)
                  switch (propKey$jscomp$9) {
                    case "children":
                      children$jscomp$7 = propValue$jscomp$9;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$6 = propValue$jscomp$9;
                  }
              }
            var child$jscomp$0 = Array.isArray(children$jscomp$7)
              ? 2 > children$jscomp$7.length
                ? children$jscomp$7[0]
                : null
              : children$jscomp$7;
            "function" !== typeof child$jscomp$0 &&
              "symbol" !== typeof child$jscomp$0 &&
              null !== child$jscomp$0 &&
              void 0 !== child$jscomp$0 &&
              target.push(
                stringToChunk(
                  ("" + child$jscomp$0).replace(styleRegex, styleReplacer)
                )
              );
            pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
          }
        }
        styleQueue$jscomp$0 &&
          hoistableState &&
          hoistableState.styles.add(styleQueue$jscomp$0);
        textEmbedded && target$jscomp$0.push(textSeparator);
        JSCompiler_inline_result$jscomp$6 = void 0;
      }
      return JSCompiler_inline_result$jscomp$6;
    case "meta":
      var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1,
        isFallback$jscomp$1 = formatContext.tagScope & 4;
      if (
        4 === formatContext.insertionMode ||
        noscriptTagInScope$jscomp$3 ||
        null != props.itemProp
      )
        var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(
          target$jscomp$0,
          props,
          "meta"
        );
      else
        textEmbedded && target$jscomp$0.push(textSeparator),
          (JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1
            ? null
            : "string" === typeof props.charSet
              ? pushSelfClosing(renderState.charsetChunks, props, "meta")
              : "viewport" === props.name
                ? pushSelfClosing(renderState.viewportChunks, props, "meta")
                : pushSelfClosing(renderState.hoistableChunks, props, "meta"));
      return JSCompiler_inline_result$jscomp$7;
    case "listing":
    case "pre":
      target$jscomp$0.push(startChunkForTag(type));
      var children$jscomp$8 = null,
        innerHTML$jscomp$7 = null,
        propKey$jscomp$10;
      for (propKey$jscomp$10 in props)
        if (hasOwnProperty.call(props, propKey$jscomp$10)) {
          var propValue$jscomp$10 = props[propKey$jscomp$10];
          if (null != propValue$jscomp$10)
            switch (propKey$jscomp$10) {
              case "children":
                children$jscomp$8 = propValue$jscomp$10;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML$jscomp$7 = propValue$jscomp$10;
                break;
              default:
                pushAttribute(
                  target$jscomp$0,
                  propKey$jscomp$10,
                  propValue$jscomp$10
                );
            }
        }
      target$jscomp$0.push(endOfStartTag);
      if (null != innerHTML$jscomp$7) {
        if (null != children$jscomp$8) throw Error(formatProdErrorMessage(60));
        if (
          "object" !== typeof innerHTML$jscomp$7 ||
          !("__html" in innerHTML$jscomp$7)
        )
          throw Error(formatProdErrorMessage(61));
        var html = innerHTML$jscomp$7.__html;
        null !== html &&
          void 0 !== html &&
          ("string" === typeof html && 0 < html.length && "\n" === html[0]
            ? target$jscomp$0.push(leadingNewline, stringToChunk(html))
            : target$jscomp$0.push(stringToChunk("" + html)));
      }
      "string" === typeof children$jscomp$8 &&
        "\n" === children$jscomp$8[0] &&
        target$jscomp$0.push(leadingNewline);
      return children$jscomp$8;
    case "img":
      var pictureOrNoScriptTagInScope = formatContext.tagScope & 3,
        src = props.src,
        srcSet = props.srcSet;
      if (
        !(
          "lazy" === props.loading ||
          (!src && !srcSet) ||
          ("string" !== typeof src && null != src) ||
          ("string" !== typeof srcSet && null != srcSet) ||
          "low" === props.fetchPriority ||
          pictureOrNoScriptTagInScope
        ) &&
        ("string" !== typeof src ||
          ":" !== src[4] ||
          ("d" !== src[0] && "D" !== src[0]) ||
          ("a" !== src[1] && "A" !== src[1]) ||
          ("t" !== src[2] && "T" !== src[2]) ||
          ("a" !== src[3] && "A" !== src[3])) &&
        ("string" !== typeof srcSet ||
          ":" !== srcSet[4] ||
          ("d" !== srcSet[0] && "D" !== srcSet[0]) ||
          ("a" !== srcSet[1] && "A" !== srcSet[1]) ||
          ("t" !== srcSet[2] && "T" !== srcSet[2]) ||
          ("a" !== srcSet[3] && "A" !== srcSet[3]))
      ) {
        null !== hoistableState &&
          formatContext.tagScope & 64 &&
          (hoistableState.suspenseyImages = !0);
        var sizes = "string" === typeof props.sizes ? props.sizes : void 0,
          key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src,
          promotablePreloads = renderState.preloads.images,
          resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
        if (resource$jscomp$1) {
          if (
            "high" === props.fetchPriority ||
            10 > renderState.highImagePreloads.size
          )
            promotablePreloads.delete(key$jscomp$0),
              renderState.highImagePreloads.add(resource$jscomp$1);
        } else if (
          !resumableState.imageResources.hasOwnProperty(key$jscomp$0)
        ) {
          resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
          var input = props.crossOrigin;
          var JSCompiler_inline_result$jscomp$8 =
            "string" === typeof input
              ? "use-credentials" === input
                ? input
                : ""
              : void 0;
          var headers = renderState.headers,
            header;
          headers &&
          0 < headers.remainingCapacity &&
          "string" !== typeof props.srcSet &&
          ("high" === props.fetchPriority ||
            500 > headers.highImagePreloads.length) &&
          ((header = getPreloadAsHeader(src, "image", {
            imageSrcSet: props.srcSet,
            imageSizes: props.sizes,
            crossOrigin: JSCompiler_inline_result$jscomp$8,
            integrity: props.integrity,
            nonce: props.nonce,
            type: props.type,
            fetchPriority: props.fetchPriority,
            referrerPolicy: props.refererPolicy
          })),
          0 <= (headers.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS),
              headers.highImagePreloads && (headers.highImagePreloads += ", "),
              (headers.highImagePreloads += header))
            : ((resource$jscomp$1 = []),
              pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? void 0 : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }),
              "high" === props.fetchPriority ||
              10 > renderState.highImagePreloads.size
                ? renderState.highImagePreloads.add(resource$jscomp$1)
                : (renderState.bulkPreloads.add(resource$jscomp$1),
                  promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
        }
      }
      return pushSelfClosing(target$jscomp$0, props, "img");
    case "base":
    case "area":
    case "br":
    case "col":
    case "embed":
    case "hr":
    case "keygen":
    case "param":
    case "source":
    case "track":
    case "wbr":
      return pushSelfClosing(target$jscomp$0, props, type);
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      break;
    case "head":
      if (2 > formatContext.insertionMode) {
        var preamble = preambleState || renderState.preamble;
        if (preamble.headChunks)
          throw Error(formatProdErrorMessage(545, "`<head>`"));
        null !== preambleState &&
          target$jscomp$0.push(headPreambleContributionChunk);
        preamble.headChunks = [];
        var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(
          preamble.headChunks,
          props,
          "head"
        );
      } else
        JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "head"
        );
      return JSCompiler_inline_result$jscomp$9;
    case "body":
      if (2 > formatContext.insertionMode) {
        var preamble$jscomp$0 = preambleState || renderState.preamble;
        if (preamble$jscomp$0.bodyChunks)
          throw Error(formatProdErrorMessage(545, "`<body>`"));
        null !== preambleState &&
          target$jscomp$0.push(bodyPreambleContributionChunk);
        preamble$jscomp$0.bodyChunks = [];
        var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(
          preamble$jscomp$0.bodyChunks,
          props,
          "body"
        );
      } else
        JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "body"
        );
      return JSCompiler_inline_result$jscomp$10;
    case "html":
      if (0 === formatContext.insertionMode) {
        var preamble$jscomp$1 = preambleState || renderState.preamble;
        if (preamble$jscomp$1.htmlChunks)
          throw Error(formatProdErrorMessage(545, "`<html>`"));
        null !== preambleState &&
          target$jscomp$0.push(htmlPreambleContributionChunk);
        preamble$jscomp$1.htmlChunks = [doctypeChunk];
        var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(
          preamble$jscomp$1.htmlChunks,
          props,
          "html"
        );
      } else
        JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(
          target$jscomp$0,
          props,
          "html"
        );
      return JSCompiler_inline_result$jscomp$11;
    default:
      if (-1 !== type.indexOf("-")) {
        target$jscomp$0.push(startChunkForTag(type));
        var children$jscomp$9 = null,
          innerHTML$jscomp$8 = null,
          propKey$jscomp$11;
        for (propKey$jscomp$11 in props)
          if (hasOwnProperty.call(props, propKey$jscomp$11)) {
            var propValue$jscomp$11 = props[propKey$jscomp$11];
            if (null != propValue$jscomp$11) {
              var attributeName = propKey$jscomp$11;
              switch (propKey$jscomp$11) {
                case "children":
                  children$jscomp$9 = propValue$jscomp$11;
                  break;
                case "dangerouslySetInnerHTML":
                  innerHTML$jscomp$8 = propValue$jscomp$11;
                  break;
                case "style":
                  pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                  break;
                case "suppressContentEditableWarning":
                case "suppressHydrationWarning":
                case "ref":
                  break;
                case "className":
                  attributeName = "class";
                default:
                  if (
                    isAttributeNameSafe(propKey$jscomp$11) &&
                    "function" !== typeof propValue$jscomp$11 &&
                    "symbol" !== typeof propValue$jscomp$11 &&
                    !1 !== propValue$jscomp$11
                  ) {
                    if (!0 === propValue$jscomp$11) propValue$jscomp$11 = "";
                    else if ("object" === typeof propValue$jscomp$11) continue;
                    target$jscomp$0.push(
                      attributeSeparator,
                      stringToChunk(attributeName),
                      attributeAssign,
                      stringToChunk(escapeTextForBrowser(propValue$jscomp$11)),
                      attributeEnd
                    );
                  }
              }
            }
          }
        target$jscomp$0.push(endOfStartTag);
        pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
        return children$jscomp$9;
      }
  }
  return pushStartGenericElement(target$jscomp$0, props, type);
}
var endTagCache = new Map();
function endChunkForTag(tag) {
  var chunk = endTagCache.get(tag);
  void 0 === chunk &&
    ((chunk = stringToPrecomputedChunk("</" + tag + ">")),
    endTagCache.set(tag, chunk));
  return chunk;
}
function hoistPreambleState(renderState, preambleState) {
  renderState = renderState.preamble;
  null === renderState.htmlChunks &&
    preambleState.htmlChunks &&
    (renderState.htmlChunks = preambleState.htmlChunks);
  null === renderState.headChunks &&
    preambleState.headChunks &&
    (renderState.headChunks = preambleState.headChunks);
  null === renderState.bodyChunks &&
    preambleState.bodyChunks &&
    (renderState.bodyChunks = preambleState.bodyChunks);
}
function writeBootstrap(destination, renderState) {
  renderState = renderState.bootstrapChunks;
  for (var i = 0; i < renderState.length - 1; i++)
    writeChunk(destination, renderState[i]);
  return i < renderState.length
    ? ((i = renderState[i]),
      (renderState.length = 0),
      writeChunkAndReturn(destination, i))
    : !0;
}
var shellTimeRuntimeScript = stringToPrecomputedChunk(
    "requestAnimationFrame(function(){$RT=performance.now()});"
  ),
  placeholder1 = stringToPrecomputedChunk('<template id="'),
  placeholder2 = stringToPrecomputedChunk('"></template>'),
  startActivityBoundary = stringToPrecomputedChunk("\x3c!--&--\x3e"),
  endActivityBoundary = stringToPrecomputedChunk("\x3c!--/&--\x3e"),
  startCompletedSuspenseBoundary = stringToPrecomputedChunk("\x3c!--$--\x3e"),
  startPendingSuspenseBoundary1 = stringToPrecomputedChunk(
    '\x3c!--$?--\x3e<template id="'
  ),
  startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>'),
  startClientRenderedSuspenseBoundary =
    stringToPrecomputedChunk("\x3c!--$!--\x3e"),
  endSuspenseBoundary = stringToPrecomputedChunk("\x3c!--/$--\x3e"),
  clientRenderedSuspenseBoundaryError1 = stringToPrecomputedChunk("<template"),
  clientRenderedSuspenseBoundaryErrorAttrInterstitial =
    stringToPrecomputedChunk('"'),
  clientRenderedSuspenseBoundaryError1A =
    stringToPrecomputedChunk(' data-dgst="');
stringToPrecomputedChunk(' data-msg="');
stringToPrecomputedChunk(' data-stck="');
stringToPrecomputedChunk(' data-cstck="');
var clientRenderedSuspenseBoundaryError2 =
  stringToPrecomputedChunk("></template>");
function writeStartPendingSuspenseBoundary(destination, renderState, id) {
  writeChunk(destination, startPendingSuspenseBoundary1);
  if (null === id) throw Error(formatProdErrorMessage(395));
  writeChunk(destination, renderState.boundaryPrefix);
  writeChunk(destination, stringToChunk(id.toString(16)));
  return writeChunkAndReturn(destination, startPendingSuspenseBoundary2);
}
var startSegmentHTML = stringToPrecomputedChunk('<div hidden id="'),
  startSegmentHTML2 = stringToPrecomputedChunk('">'),
  endSegmentHTML = stringToPrecomputedChunk("</div>"),
  startSegmentSVG = stringToPrecomputedChunk(
    '<svg aria-hidden="true" style="display:none" id="'
  ),
  startSegmentSVG2 = stringToPrecomputedChunk('">'),
  endSegmentSVG = stringToPrecomputedChunk("</svg>"),
  startSegmentMathML = stringToPrecomputedChunk(
    '<math aria-hidden="true" style="display:none" id="'
  ),
  startSegmentMathML2 = stringToPrecomputedChunk('">'),
  endSegmentMathML = stringToPrecomputedChunk("</math>"),
  startSegmentTable = stringToPrecomputedChunk('<table hidden id="'),
  startSegmentTable2 = stringToPrecomputedChunk('">'),
  endSegmentTable = stringToPrecomputedChunk("</table>"),
  startSegmentTableBody = stringToPrecomputedChunk('<table hidden><tbody id="'),
  startSegmentTableBody2 = stringToPrecomputedChunk('">'),
  endSegmentTableBody = stringToPrecomputedChunk("</tbody></table>"),
  startSegmentTableRow = stringToPrecomputedChunk('<table hidden><tr id="'),
  startSegmentTableRow2 = stringToPrecomputedChunk('">'),
  endSegmentTableRow = stringToPrecomputedChunk("</tr></table>"),
  startSegmentColGroup = stringToPrecomputedChunk(
    '<table hidden><colgroup id="'
  ),
  startSegmentColGroup2 = stringToPrecomputedChunk('">'),
  endSegmentColGroup = stringToPrecomputedChunk("</colgroup></table>");
function writeStartSegment(destination, renderState, formatContext, id) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return (
        writeChunk(destination, startSegmentHTML),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentHTML2)
      );
    case 4:
      return (
        writeChunk(destination, startSegmentSVG),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentSVG2)
      );
    case 5:
      return (
        writeChunk(destination, startSegmentMathML),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentMathML2)
      );
    case 6:
      return (
        writeChunk(destination, startSegmentTable),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentTable2)
      );
    case 7:
      return (
        writeChunk(destination, startSegmentTableBody),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentTableBody2)
      );
    case 8:
      return (
        writeChunk(destination, startSegmentTableRow),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentTableRow2)
      );
    case 9:
      return (
        writeChunk(destination, startSegmentColGroup),
        writeChunk(destination, renderState.segmentPrefix),
        writeChunk(destination, stringToChunk(id.toString(16))),
        writeChunkAndReturn(destination, startSegmentColGroup2)
      );
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
function writeEndSegment(destination, formatContext) {
  switch (formatContext.insertionMode) {
    case 0:
    case 1:
    case 3:
    case 2:
      return writeChunkAndReturn(destination, endSegmentHTML);
    case 4:
      return writeChunkAndReturn(destination, endSegmentSVG);
    case 5:
      return writeChunkAndReturn(destination, endSegmentMathML);
    case 6:
      return writeChunkAndReturn(destination, endSegmentTable);
    case 7:
      return writeChunkAndReturn(destination, endSegmentTableBody);
    case 8:
      return writeChunkAndReturn(destination, endSegmentTableRow);
    case 9:
      return writeChunkAndReturn(destination, endSegmentColGroup);
    default:
      throw Error(formatProdErrorMessage(397));
  }
}
var completeSegmentScript1Full = stringToPrecomputedChunk(
    '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'
  ),
  completeSegmentScript1Partial = stringToPrecomputedChunk('$RS("'),
  completeSegmentScript2 = stringToPrecomputedChunk('","'),
  completeSegmentScriptEnd = stringToPrecomputedChunk('")\x3c/script>');
stringToPrecomputedChunk('<template data-rsi="" data-sid="');
stringToPrecomputedChunk('" data-pid="');
var completeBoundaryScriptFunctionOnly = stringToPrecomputedChunk(
  '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
);
stringToChunk(
  '$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),"auto"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute("vt-name"))||(a="_T_"+K++ +"_"),b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll("[vt-share]"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute("vt-name"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if("/$"===r)if(0===f)break;else f--;else"$"!==r&&"$?"!==r&&"$~"!==r&&"$!"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute("vt-name"),y=m.get(D);k(d,y?"vt-share":"vt-exit");y&&(k(y,"vt-share"),m.set(D,null));var E=d.querySelectorAll("[vt-share]");for(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute("vt-name"),\nH=m.get(G);H&&(k(F,"vt-share"),k(H,"vt-share"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute("vt-name"))&&k(t,"vt-enter"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute("vt-update");J&&"none"!==J&&!l.includes(n)&&k(n,"vt-update");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&"none"!==c.getAttribute("vt-update"));u.push.apply(u,I.querySelectorAll(\'img[src]:not([loading="lazy"])\'))}}}if(B){var z=\ndocument.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener("load",q);w.g.addEventListener("error",q)}}(b)),a.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=\nperformance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];""===b.getAttribute("style")&&b.removeAttribute("style")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,$RV);'
);
var completeBoundaryScript1Partial = stringToPrecomputedChunk('$RC("'),
  completeBoundaryWithStylesScript1FullPartial = stringToPrecomputedChunk(
    '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("'
  ),
  completeBoundaryWithStylesScript1Partial = stringToPrecomputedChunk('$RR("'),
  completeBoundaryScript2 = stringToPrecomputedChunk('","'),
  completeBoundaryScript3a = stringToPrecomputedChunk('",'),
  completeBoundaryScript3b = stringToPrecomputedChunk('"'),
  completeBoundaryScriptEnd = stringToPrecomputedChunk(")\x3c/script>");
stringToPrecomputedChunk('<template data-rci="" data-bid="');
stringToPrecomputedChunk('<template data-rri="" data-bid="');
stringToPrecomputedChunk('" data-sid="');
stringToPrecomputedChunk('" data-sty="');
var clientRenderScriptFunctionOnly = stringToPrecomputedChunk(
    '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'
  ),
  clientRenderScript1Full = stringToPrecomputedChunk(
    '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'
  ),
  clientRenderScript1Partial = stringToPrecomputedChunk('$RX("'),
  clientRenderScript1A = stringToPrecomputedChunk('"'),
  clientRenderErrorScriptArgInterstitial = stringToPrecomputedChunk(","),
  clientRenderScriptEnd = stringToPrecomputedChunk(")\x3c/script>");
stringToPrecomputedChunk('<template data-rxi="" data-bid="');
stringToPrecomputedChunk('" data-dgst="');
stringToPrecomputedChunk('" data-msg="');
stringToPrecomputedChunk('" data-stck="');
stringToPrecomputedChunk('" data-cstck="');
var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
function escapeJSStringsForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInInstructionScripts,
    function (match) {
      switch (match) {
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
function escapeJSObjectForInstructionScripts(input) {
  return JSON.stringify(input).replace(
    regexForJSStringsInScripts,
    function (match) {
      switch (match) {
        case "&":
          return "\\u0026";
        case ">":
          return "\\u003e";
        case "<":
          return "\\u003c";
        case "\u2028":
          return "\\u2028";
        case "\u2029":
          return "\\u2029";
        default:
          throw Error(
            "escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
  );
}
var lateStyleTagResourceOpen1 = stringToPrecomputedChunk(
    ' media="not all" data-precedence="'
  ),
  lateStyleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="'),
  lateStyleTagResourceOpen3 = stringToPrecomputedChunk('">'),
  lateStyleTagTemplateClose = stringToPrecomputedChunk("</style>"),
  currentlyRenderingBoundaryHasStylesToHoist = !1,
  destinationHasCapacity = !0;
function flushStyleTagsLateForBoundary(styleQueue) {
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs,
    i = 0;
  if (hrefs.length) {
    writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
    writeChunk(this, lateStyleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    for (writeChunk(this, lateStyleTagResourceOpen2); i < hrefs.length - 1; i++)
      writeChunk(this, hrefs[i]), writeChunk(this, spaceSeparator);
    writeChunk(this, hrefs[i]);
    writeChunk(this, lateStyleTagResourceOpen3);
    for (i = 0; i < rules.length; i++) writeChunk(this, rules[i]);
    destinationHasCapacity = writeChunkAndReturn(
      this,
      lateStyleTagTemplateClose
    );
    currentlyRenderingBoundaryHasStylesToHoist = !0;
    rules.length = 0;
    hrefs.length = 0;
  }
}
function hasStylesToHoist(stylesheet) {
  return 2 !== stylesheet.state
    ? (currentlyRenderingBoundaryHasStylesToHoist = !0)
    : !1;
}
function writeHoistablesForBoundary(destination, hoistableState, renderState) {
  currentlyRenderingBoundaryHasStylesToHoist = !1;
  destinationHasCapacity = !0;
  currentlyFlushingRenderState = renderState;
  hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
  currentlyFlushingRenderState = null;
  hoistableState.stylesheets.forEach(hasStylesToHoist);
  currentlyRenderingBoundaryHasStylesToHoist &&
    (renderState.stylesToHoist = !0);
  return destinationHasCapacity;
}
function flushResource(resource) {
  for (var i = 0; i < resource.length; i++) writeChunk(this, resource[i]);
  resource.length = 0;
}
var stylesheetFlushingQueue = [];
function flushStyleInPreamble(stylesheet) {
  pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
  for (var i = 0; i < stylesheetFlushingQueue.length; i++)
    writeChunk(this, stylesheetFlushingQueue[i]);
  stylesheetFlushingQueue.length = 0;
  stylesheet.state = 2;
}
var styleTagResourceOpen1 = stringToPrecomputedChunk(' data-precedence="'),
  styleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="'),
  spaceSeparator = stringToPrecomputedChunk(" "),
  styleTagResourceOpen3 = stringToPrecomputedChunk('">'),
  styleTagResourceClose = stringToPrecomputedChunk("</style>");
function flushStylesInPreamble(styleQueue) {
  var hasStylesheets = 0 < styleQueue.sheets.size;
  styleQueue.sheets.forEach(flushStyleInPreamble, this);
  styleQueue.sheets.clear();
  var rules = styleQueue.rules,
    hrefs = styleQueue.hrefs;
  if (!hasStylesheets || hrefs.length) {
    writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
    writeChunk(this, styleTagResourceOpen1);
    writeChunk(this, styleQueue.precedence);
    styleQueue = 0;
    if (hrefs.length) {
      for (
        writeChunk(this, styleTagResourceOpen2);
        styleQueue < hrefs.length - 1;
        styleQueue++
      )
        writeChunk(this, hrefs[styleQueue]), writeChunk(this, spaceSeparator);
      writeChunk(this, hrefs[styleQueue]);
    }
    writeChunk(this, styleTagResourceOpen3);
    for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
      writeChunk(this, rules[styleQueue]);
    writeChunk(this, styleTagResourceClose);
    rules.length = 0;
    hrefs.length = 0;
  }
}
function preloadLateStyle(stylesheet) {
  if (0 === stylesheet.state) {
    stylesheet.state = 1;
    var props = stylesheet.props;
    pushLinkImpl(stylesheetFlushingQueue, {
      rel: "preload",
      as: "style",
      href: stylesheet.props.href,
      crossOrigin: props.crossOrigin,
      fetchPriority: props.fetchPriority,
      integrity: props.integrity,
      media: props.media,
      hrefLang: props.hrefLang,
      referrerPolicy: props.referrerPolicy
    });
    for (
      stylesheet = 0;
      stylesheet < stylesheetFlushingQueue.length;
      stylesheet++
    )
      writeChunk(this, stylesheetFlushingQueue[stylesheet]);
    stylesheetFlushingQueue.length = 0;
  }
}
function preloadLateStyles(styleQueue) {
  styleQueue.sheets.forEach(preloadLateStyle, this);
  styleQueue.sheets.clear();
}
stringToPrecomputedChunk('<link rel="expect" href="#');
stringToPrecomputedChunk('" blocking="render"/>');
var completedShellIdAttributeStart = stringToPrecomputedChunk(' id="');
function pushCompletedShellIdAttribute(target, resumableState) {
  0 === (resumableState.instructions & 32) &&
    ((resumableState.instructions |= 32),
    target.push(
      completedShellIdAttributeStart,
      stringToChunk(escapeTextForBrowser("_" + resumableState.idPrefix + "R_")),
      attributeEnd
    ));
}
var arrayFirstOpenBracket = stringToPrecomputedChunk("["),
  arraySubsequentOpenBracket = stringToPrecomputedChunk(",["),
  arrayInterstitial = stringToPrecomputedChunk(","),
  arrayCloseBracket = stringToPrecomputedChunk("]");
function writeStyleResourceDependenciesInJS(destination, hoistableState) {
  writeChunk(destination, arrayFirstOpenBracket);
  var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
  hoistableState.stylesheets.forEach(function (resource) {
    if (2 !== resource.state)
      if (3 === resource.state)
        writeChunk(destination, nextArrayOpenBrackChunk),
          writeChunk(
            destination,
            stringToChunk(
              escapeJSObjectForInstructionScripts("" + resource.props.href)
            )
          ),
          writeChunk(destination, arrayCloseBracket),
          (nextArrayOpenBrackChunk = arraySubsequentOpenBracket);
      else {
        writeChunk(destination, nextArrayOpenBrackChunk);
        var precedence = resource.props["data-precedence"],
          props = resource.props,
          coercedHref = sanitizeURL("" + resource.props.href);
        writeChunk(
          destination,
          stringToChunk(escapeJSObjectForInstructionScripts(coercedHref))
        );
        precedence = "" + precedence;
        writeChunk(destination, arrayInterstitial);
        writeChunk(
          destination,
          stringToChunk(escapeJSObjectForInstructionScripts(precedence))
        );
        for (var propKey in props)
          if (
            hasOwnProperty.call(props, propKey) &&
            ((precedence = props[propKey]), null != precedence)
          )
            switch (propKey) {
              case "href":
              case "rel":
              case "precedence":
              case "data-precedence":
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(399, "link"));
              default:
                writeStyleResourceAttributeInJS(
                  destination,
                  propKey,
                  precedence
                );
            }
        writeChunk(destination, arrayCloseBracket);
        nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
        resource.state = 3;
      }
  });
  writeChunk(destination, arrayCloseBracket);
}
function writeStyleResourceAttributeInJS(destination, name, value) {
  var attributeName = name.toLowerCase();
  switch (typeof value) {
    case "function":
    case "symbol":
      return;
  }
  switch (name) {
    case "innerHTML":
    case "dangerouslySetInnerHTML":
    case "suppressContentEditableWarning":
    case "suppressHydrationWarning":
    case "style":
    case "ref":
      return;
    case "className":
      attributeName = "class";
      name = "" + value;
      break;
    case "hidden":
      if (!1 === value) return;
      name = "";
      break;
    case "src":
    case "href":
      value = sanitizeURL(value);
      name = "" + value;
      break;
    default:
      if (
        (2 < name.length &&
          ("o" === name[0] || "O" === name[0]) &&
          ("n" === name[1] || "N" === name[1])) ||
        !isAttributeNameSafe(name)
      )
        return;
      name = "" + value;
  }
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(attributeName))
  );
  writeChunk(destination, arrayInterstitial);
  writeChunk(
    destination,
    stringToChunk(escapeJSObjectForInstructionScripts(name))
  );
}
function createHoistableState() {
  return { styles: new Set(), stylesheets: new Set(), suspenseyImages: !1 };
}
function prefetchDNS(href) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      if (!resumableState.dnsResources.hasOwnProperty(href)) {
        resumableState.dnsResources[href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        )
          JSCompiler_temp =
            ((header =
              "<" +
              ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) +
              ">; rel=dns-prefetch"),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        JSCompiler_temp
          ? ((renderState.resets.dns[href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((header = []),
            pushLinkImpl(header, { href: href, rel: "dns-prefetch" }),
            renderState.preconnects.add(header));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.D(href);
}
function preconnect(href, crossOrigin) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if ("string" === typeof href && href) {
      var bucket =
        "use-credentials" === crossOrigin
          ? "credentials"
          : "string" === typeof crossOrigin
            ? "anonymous"
            : "default";
      if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
        resumableState.connectResources[bucket][href] = null;
        resumableState = renderState.headers;
        var header, JSCompiler_temp;
        if (
          (JSCompiler_temp =
            resumableState && 0 < resumableState.remainingCapacity)
        ) {
          JSCompiler_temp =
            "<" +
            ("" + href).replace(
              regexForHrefInLinkHeaderURLContext,
              escapeHrefForLinkHeaderURLContextReplacer
            ) +
            ">; rel=preconnect";
          if ("string" === typeof crossOrigin) {
            var escapedCrossOrigin = ("" + crossOrigin).replace(
              regexForLinkHeaderQuotedParamValueContext,
              escapeStringForLinkHeaderQuotedParamValueContextReplacer
            );
            JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
          }
          JSCompiler_temp =
            ((header = JSCompiler_temp),
            0 <= (resumableState.remainingCapacity -= header.length + 2));
        }
        JSCompiler_temp
          ? ((renderState.resets.connect[bucket][href] = null),
            resumableState.preconnects && (resumableState.preconnects += ", "),
            (resumableState.preconnects += header))
          : ((bucket = []),
            pushLinkImpl(bucket, {
              rel: "preconnect",
              href: href,
              crossOrigin: crossOrigin
            }),
            renderState.preconnects.add(bucket));
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.C(href, crossOrigin);
}
function preload(href, as, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (as && href) {
      switch (as) {
        case "image":
          if (options) {
            var imageSrcSet = options.imageSrcSet;
            var imageSizes = options.imageSizes;
            var fetchPriority = options.fetchPriority;
          }
          var key = imageSrcSet
            ? imageSrcSet + "\n" + (imageSizes || "")
            : href;
          if (resumableState.imageResources.hasOwnProperty(key)) return;
          resumableState.imageResources[key] = PRELOAD_NO_CREDS;
          resumableState = renderState.headers;
          var header;
          resumableState &&
          0 < resumableState.remainingCapacity &&
          "string" !== typeof imageSrcSet &&
          "high" === fetchPriority &&
          ((header = getPreloadAsHeader(href, as, options)),
          0 <= (resumableState.remainingCapacity -= header.length + 2))
            ? ((renderState.resets.image[key] = PRELOAD_NO_CREDS),
              resumableState.highImagePreloads &&
                (resumableState.highImagePreloads += ", "),
              (resumableState.highImagePreloads += header))
            : ((resumableState = []),
              pushLinkImpl(
                resumableState,
                assign(
                  { rel: "preload", href: imageSrcSet ? void 0 : href, as: as },
                  options
                )
              ),
              "high" === fetchPriority
                ? renderState.highImagePreloads.add(resumableState)
                : (renderState.bulkPreloads.add(resumableState),
                  renderState.preloads.images.set(key, resumableState)));
          break;
        case "style":
          if (resumableState.styleResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.styleResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.stylesheets.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          break;
        case "script":
          if (resumableState.scriptResources.hasOwnProperty(href)) return;
          imageSrcSet = [];
          renderState.preloads.scripts.set(href, imageSrcSet);
          renderState.bulkPreloads.add(imageSrcSet);
          pushLinkImpl(
            imageSrcSet,
            assign({ rel: "preload", href: href, as: as }, options)
          );
          resumableState.scriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          break;
        default:
          if (resumableState.unknownResources.hasOwnProperty(as)) {
            if (
              ((imageSrcSet = resumableState.unknownResources[as]),
              imageSrcSet.hasOwnProperty(href))
            )
              return;
          } else
            (imageSrcSet = {}),
              (resumableState.unknownResources[as] = imageSrcSet);
          imageSrcSet[href] = PRELOAD_NO_CREDS;
          if (
            (resumableState = renderState.headers) &&
            0 < resumableState.remainingCapacity &&
            "font" === as &&
            ((key = getPreloadAsHeader(href, as, options)),
            0 <= (resumableState.remainingCapacity -= key.length + 2))
          )
            (renderState.resets.font[href] = PRELOAD_NO_CREDS),
              resumableState.fontPreloads &&
                (resumableState.fontPreloads += ", "),
              (resumableState.fontPreloads += key);
          else
            switch (
              ((resumableState = []),
              (href = assign({ rel: "preload", href: href, as: as }, options)),
              pushLinkImpl(resumableState, href),
              as)
            ) {
              case "font":
                renderState.fontPreloads.add(resumableState);
                break;
              default:
                renderState.bulkPreloads.add(resumableState);
            }
      }
      enqueueFlush(request);
    }
  } else previousDispatcher.L(href, as, options);
}
function preloadModule(href, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      var as =
        options && "string" === typeof options.as ? options.as : "script";
      switch (as) {
        case "script":
          if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
          as = [];
          resumableState.moduleScriptResources[href] =
            !options ||
            ("string" !== typeof options.crossOrigin &&
              "string" !== typeof options.integrity)
              ? PRELOAD_NO_CREDS
              : [options.crossOrigin, options.integrity];
          renderState.preloads.moduleScripts.set(href, as);
          break;
        default:
          if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
            var resources = resumableState.unknownResources[as];
            if (resources.hasOwnProperty(href)) return;
          } else
            (resources = {}),
              (resumableState.moduleUnknownResources[as] = resources);
          as = [];
          resources[href] = PRELOAD_NO_CREDS;
      }
      pushLinkImpl(as, assign({ rel: "modulepreload", href: href }, options));
      renderState.bulkPreloads.add(as);
      enqueueFlush(request);
    }
  } else previousDispatcher.m(href, options);
}
function preinitStyle(href, precedence, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (href) {
      precedence = precedence || "default";
      var styleQueue = renderState.styles.get(precedence),
        resourceState = resumableState.styleResources.hasOwnProperty(href)
          ? resumableState.styleResources[href]
          : void 0;
      null !== resourceState &&
        ((resumableState.styleResources[href] = null),
        styleQueue ||
          ((styleQueue = {
            precedence: stringToChunk(escapeTextForBrowser(precedence)),
            rules: [],
            hrefs: [],
            sheets: new Map()
          }),
          renderState.styles.set(precedence, styleQueue)),
        (precedence = {
          state: 0,
          props: assign(
            { rel: "stylesheet", href: href, "data-precedence": precedence },
            options
          )
        }),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(precedence.props, resourceState),
          (renderState = renderState.preloads.stylesheets.get(href)) &&
          0 < renderState.length
            ? (renderState.length = 0)
            : (precedence.state = 1)),
        styleQueue.sheets.set(href, precedence),
        enqueueFlush(request));
    }
  } else previousDispatcher.S(href, precedence, options);
}
function preinitScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.scriptResources.hasOwnProperty(src)
        ? resumableState.scriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.scriptResources[src] = null),
        (options = assign({ src: src, async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.scripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.X(src, options);
}
function preinitModuleScript(src, options) {
  var request = currentRequest ? currentRequest : null;
  if (request) {
    var resumableState = request.resumableState,
      renderState = request.renderState;
    if (src) {
      var resourceState = resumableState.moduleScriptResources.hasOwnProperty(
        src
      )
        ? resumableState.moduleScriptResources[src]
        : void 0;
      null !== resourceState &&
        ((resumableState.moduleScriptResources[src] = null),
        (options = assign({ src: src, type: "module", async: !0 }, options)),
        resourceState &&
          (2 === resourceState.length &&
            adoptPreloadCredentials(options, resourceState),
          (src = renderState.preloads.moduleScripts.get(src))) &&
          (src.length = 0),
        (src = []),
        renderState.scripts.add(src),
        pushScriptImpl(src, options),
        enqueueFlush(request));
    }
  } else previousDispatcher.M(src, options);
}
function adoptPreloadCredentials(target, preloadState) {
  null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
  null == target.integrity && (target.integrity = preloadState[1]);
}
function getPreloadAsHeader(href, as, params) {
  href = ("" + href).replace(
    regexForHrefInLinkHeaderURLContext,
    escapeHrefForLinkHeaderURLContextReplacer
  );
  as = ("" + as).replace(
    regexForLinkHeaderQuotedParamValueContext,
    escapeStringForLinkHeaderQuotedParamValueContextReplacer
  );
  as = "<" + href + '>; rel=preload; as="' + as + '"';
  for (var paramName in params)
    hasOwnProperty.call(params, paramName) &&
      ((href = params[paramName]),
      "string" === typeof href &&
        (as +=
          "; " +
          paramName.toLowerCase() +
          '="' +
          ("" + href).replace(
            regexForLinkHeaderQuotedParamValueContext,
            escapeStringForLinkHeaderQuotedParamValueContextReplacer
          ) +
          '"'));
  return as;
}
var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
function escapeHrefForLinkHeaderURLContextReplacer(match) {
  switch (match) {
    case "<":
      return "%3C";
    case ">":
      return "%3E";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
  switch (match) {
    case '"':
      return "%22";
    case "'":
      return "%27";
    case ";":
      return "%3B";
    case ",":
      return "%2C";
    case "\n":
      return "%0A";
    case "\r":
      return "%0D";
    default:
      throw Error(
        "escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
      );
  }
}
function hoistStyleQueueDependency(styleQueue) {
  this.styles.add(styleQueue);
}
function hoistStylesheetDependency(stylesheet) {
  this.stylesheets.add(stylesheet);
}
function hoistHoistables(parentState, childState) {
  childState.styles.forEach(hoistStyleQueueDependency, parentState);
  childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
  childState.suspenseyImages && (parentState.suspenseyImages = !0);
}
function hasSuspenseyContent(hoistableState) {
  return 0 < hoistableState.stylesheets.size || hoistableState.suspenseyImages;
}
var bind = Function.prototype.bind,
  REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type) {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
var emptyContextObject = {},
  currentActiveSnapshot = null;
function popToNearestCommonAncestor(prev, next) {
  if (prev !== next) {
    prev.context._currentValue = prev.parentValue;
    prev = prev.parent;
    var parentNext = next.parent;
    if (null === prev) {
      if (null !== parentNext) throw Error(formatProdErrorMessage(401));
    } else {
      if (null === parentNext) throw Error(formatProdErrorMessage(401));
      popToNearestCommonAncestor(prev, parentNext);
    }
    next.context._currentValue = next.value;
  }
}
function popAllPrevious(prev) {
  prev.context._currentValue = prev.parentValue;
  prev = prev.parent;
  null !== prev && popAllPrevious(prev);
}
function pushAllNext(next) {
  var parentNext = next.parent;
  null !== parentNext && pushAllNext(parentNext);
  next.context._currentValue = next.value;
}
function popPreviousToCommonLevel(prev, next) {
  prev.context._currentValue = prev.parentValue;
  prev = prev.parent;
  if (null === prev) throw Error(formatProdErrorMessage(402));
  prev.depth === next.depth
    ? popToNearestCommonAncestor(prev, next)
    : popPreviousToCommonLevel(prev, next);
}
function popNextToCommonLevel(prev, next) {
  var parentNext = next.parent;
  if (null === parentNext) throw Error(formatProdErrorMessage(402));
  prev.depth === parentNext.depth
    ? popToNearestCommonAncestor(prev, parentNext)
    : popNextToCommonLevel(prev, parentNext);
  next.context._currentValue = next.value;
}
function switchContext(newSnapshot) {
  var prev = currentActiveSnapshot;
  prev !== newSnapshot &&
    (null === prev
      ? pushAllNext(newSnapshot)
      : null === newSnapshot
        ? popAllPrevious(prev)
        : prev.depth === newSnapshot.depth
          ? popToNearestCommonAncestor(prev, newSnapshot)
          : prev.depth > newSnapshot.depth
            ? popPreviousToCommonLevel(prev, newSnapshot)
            : popNextToCommonLevel(prev, newSnapshot),
    (currentActiveSnapshot = newSnapshot));
}
var classComponentUpdater = {
    enqueueSetState: function (inst, payload) {
      inst = inst._reactInternals;
      null !== inst.queue && inst.queue.push(payload);
    },
    enqueueReplaceState: function (inst, payload) {
      inst = inst._reactInternals;
      inst.replace = !0;
      inst.queue = [payload];
    },
    enqueueForceUpdate: function () {}
  },
  emptyTreeContext = { id: 1, overflow: "" };
function pushTreeContext(baseContext, totalChildren, index) {
  var baseIdWithLeadingBit = baseContext.id;
  baseContext = baseContext.overflow;
  var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
  baseIdWithLeadingBit &= ~(1 << baseLength);
  index += 1;
  var length = 32 - clz32(totalChildren) + baseLength;
  if (30 < length) {
    var numberOfOverflowBits = baseLength - (baseLength % 5);
    length = (
      baseIdWithLeadingBit &
      ((1 << numberOfOverflowBits) - 1)
    ).toString(32);
    baseIdWithLeadingBit >>= numberOfOverflowBits;
    baseLength -= numberOfOverflowBits;
    return {
      id:
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit,
      overflow: length + baseContext
    };
  }
  return {
    id: (1 << length) | (index << baseLength) | baseIdWithLeadingBit,
    overflow: baseContext
  };
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x) {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
function noop() {}
var SuspenseException = Error(formatProdErrorMessage(460));
function trackUsedThenable(thenableState, thenable, index) {
  index = thenableState[index];
  void 0 === index
    ? thenableState.push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = index));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      "string" === typeof thenable.status
        ? thenable.then(noop, noop)
        : ((thenableState = thenable),
          (thenableState.status = "pending"),
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
var suspendedThenable = null;
function getSuspendedThenable() {
  if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
function is(x, y) {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is,
  currentlyRenderingComponent = null,
  currentlyRenderingTask = null,
  currentlyRenderingRequest = null,
  currentlyRenderingKeyPath = null,
  firstWorkInProgressHook = null,
  workInProgressHook = null,
  isReRender = !1,
  didScheduleRenderPhaseUpdate = !1,
  localIdCounter = 0,
  actionStateCounter = 0,
  actionStateMatchingIndex = -1,
  thenableIndexCounter = 0,
  thenableState = null,
  renderPhaseUpdates = null,
  numberOfReRenders = 0;
function resolveCurrentlyRenderingComponent() {
  if (null === currentlyRenderingComponent)
    throw Error(formatProdErrorMessage(321));
  return currentlyRenderingComponent;
}
function createHook() {
  if (0 < numberOfReRenders) throw Error(formatProdErrorMessage(312));
  return { memoizedState: null, queue: null, next: null };
}
function createWorkInProgressHook() {
  null === workInProgressHook
    ? null === firstWorkInProgressHook
      ? ((isReRender = !1),
        (firstWorkInProgressHook = workInProgressHook = createHook()))
      : ((isReRender = !0), (workInProgressHook = firstWorkInProgressHook))
    : null === workInProgressHook.next
      ? ((isReRender = !1),
        (workInProgressHook = workInProgressHook.next = createHook()))
      : ((isReRender = !0), (workInProgressHook = workInProgressHook.next));
  return workInProgressHook;
}
function getThenableStateAfterSuspending() {
  var state = thenableState;
  thenableState = null;
  return state;
}
function resetHooksState() {
  currentlyRenderingKeyPath =
    currentlyRenderingRequest =
    currentlyRenderingTask =
    currentlyRenderingComponent =
      null;
  didScheduleRenderPhaseUpdate = !1;
  firstWorkInProgressHook = null;
  numberOfReRenders = 0;
  workInProgressHook = renderPhaseUpdates = null;
}
function basicStateReducer(state, action) {
  return "function" === typeof action ? action(state) : action;
}
function useReducer(reducer, initialArg, init) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  if (isReRender) {
    var queue = workInProgressHook.queue;
    initialArg = queue.dispatch;
    if (
      null !== renderPhaseUpdates &&
      ((init = renderPhaseUpdates.get(queue)), void 0 !== init)
    ) {
      renderPhaseUpdates.delete(queue);
      queue = workInProgressHook.memoizedState;
      do (queue = reducer(queue, init.action)), (init = init.next);
      while (null !== init);
      workInProgressHook.memoizedState = queue;
      return [queue, initialArg];
    }
    return [workInProgressHook.memoizedState, initialArg];
  }
  reducer =
    reducer === basicStateReducer
      ? "function" === typeof initialArg
        ? initialArg()
        : initialArg
      : void 0 !== init
        ? init(initialArg)
        : initialArg;
  workInProgressHook.memoizedState = reducer;
  reducer = workInProgressHook.queue = { last: null, dispatch: null };
  reducer = reducer.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingComponent,
    reducer
  );
  return [workInProgressHook.memoizedState, reducer];
}
function useMemo(nextCreate, deps) {
  currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
  workInProgressHook = createWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  if (null !== workInProgressHook) {
    var prevState = workInProgressHook.memoizedState;
    if (null !== prevState && null !== deps) {
      var prevDeps = prevState[1];
      a: if (null === prevDeps) prevDeps = !1;
      else {
        for (var i = 0; i < prevDeps.length && i < deps.length; i++)
          if (!objectIs(deps[i], prevDeps[i])) {
            prevDeps = !1;
            break a;
          }
        prevDeps = !0;
      }
      if (prevDeps) return prevState[0];
    }
  }
  nextCreate = nextCreate();
  workInProgressHook.memoizedState = [nextCreate, deps];
  return nextCreate;
}
function dispatchAction(componentIdentity, queue, action) {
  if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
  if (componentIdentity === currentlyRenderingComponent)
    if (
      ((didScheduleRenderPhaseUpdate = !0),
      (componentIdentity = { action: action, next: null }),
      null === renderPhaseUpdates && (renderPhaseUpdates = new Map()),
      (action = renderPhaseUpdates.get(queue)),
      void 0 === action)
    )
      renderPhaseUpdates.set(queue, componentIdentity);
    else {
      for (queue = action; null !== queue.next; ) queue = queue.next;
      queue.next = componentIdentity;
    }
}
function throwOnUseEffectEventCall() {
  throw Error(formatProdErrorMessage(440));
}
function unsupportedStartTransition() {
  throw Error(formatProdErrorMessage(394));
}
function unsupportedSetOptimisticState() {
  throw Error(formatProdErrorMessage(479));
}
function useActionState(action, initialState, permalink) {
  resolveCurrentlyRenderingComponent();
  var actionStateHookIndex = actionStateCounter++,
    request = currentlyRenderingRequest;
  if ("function" === typeof action.$$FORM_ACTION) {
    var nextPostbackStateKey = null,
      componentKeyPath = currentlyRenderingKeyPath;
    request = request.formState;
    var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
    if (null !== request && "function" === typeof isSignatureEqual) {
      var postbackKey = request[1];
      isSignatureEqual.call(action, request[2], request[3]) &&
        ((nextPostbackStateKey =
          void 0 !== permalink
            ? "p" + permalink
            : "k" +
              murmurhash3_32_gc(
                JSON.stringify([componentKeyPath, null, actionStateHookIndex]),
                0
              )),
        postbackKey === nextPostbackStateKey &&
          ((actionStateMatchingIndex = actionStateHookIndex),
          (initialState = request[0])));
    }
    var boundAction = action.bind(null, initialState);
    action = function (payload) {
      boundAction(payload);
    };
    "function" === typeof boundAction.$$FORM_ACTION &&
      (action.$$FORM_ACTION = function (prefix) {
        prefix = boundAction.$$FORM_ACTION(prefix);
        void 0 !== permalink &&
          ((permalink += ""), (prefix.action = permalink));
        var formData = prefix.data;
        formData &&
          (null === nextPostbackStateKey &&
            (nextPostbackStateKey =
              void 0 !== permalink
                ? "p" + permalink
                : "k" +
                  murmurhash3_32_gc(
                    JSON.stringify([
                      componentKeyPath,
                      null,
                      actionStateHookIndex
                    ]),
                    0
                  )),
          formData.append("$ACTION_KEY", nextPostbackStateKey));
        return prefix;
      });
    return [initialState, action, !1];
  }
  var boundAction$22 = action.bind(null, initialState);
  return [
    initialState,
    function (payload) {
      boundAction$22(payload);
    },
    !1
  ];
}
function unwrapThenable(thenable) {
  var index = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  return trackUsedThenable(thenableState, thenable, index);
}
function unsupportedRefresh() {
  throw Error(formatProdErrorMessage(393));
}
var HooksDispatcher = {
    readContext: function (context) {
      return context._currentValue;
    },
    use: function (usable) {
      if (null !== usable && "object" === typeof usable) {
        if ("function" === typeof usable.then) return unwrapThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE) return usable._currentValue;
      }
      throw Error(formatProdErrorMessage(438, String(usable)));
    },
    useContext: function (context) {
      resolveCurrentlyRenderingComponent();
      return context._currentValue;
    },
    useMemo: useMemo,
    useReducer: useReducer,
    useRef: function (initialValue) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      var previousRef = workInProgressHook.memoizedState;
      return null === previousRef
        ? ((initialValue = { current: initialValue }),
          (workInProgressHook.memoizedState = initialValue))
        : previousRef;
    },
    useState: function (initialState) {
      return useReducer(basicStateReducer, initialState);
    },
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useCallback: function (callback, deps) {
      return useMemo(function () {
        return callback;
      }, deps);
    },
    useImperativeHandle: noop,
    useEffect: noop,
    useDebugValue: noop,
    useDeferredValue: function (value, initialValue) {
      resolveCurrentlyRenderingComponent();
      return void 0 !== initialValue ? initialValue : value;
    },
    useTransition: function () {
      resolveCurrentlyRenderingComponent();
      return [!1, unsupportedStartTransition];
    },
    useId: function () {
      var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
      var overflow = JSCompiler_inline_result.overflow;
      JSCompiler_inline_result = JSCompiler_inline_result.id;
      JSCompiler_inline_result =
        (
          JSCompiler_inline_result &
          ~(1 << (32 - clz32(JSCompiler_inline_result) - 1))
        ).toString(32) + overflow;
      var resumableState = currentResumableState;
      if (null === resumableState) throw Error(formatProdErrorMessage(404));
      overflow = localIdCounter++;
      JSCompiler_inline_result =
        "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
      0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
      return JSCompiler_inline_result + "_";
    },
    useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
      if (void 0 === getServerSnapshot)
        throw Error(formatProdErrorMessage(407));
      return getServerSnapshot();
    },
    useOptimistic: function (passthrough) {
      resolveCurrentlyRenderingComponent();
      return [passthrough, unsupportedSetOptimisticState];
    },
    useActionState: useActionState,
    useFormState: useActionState,
    useHostTransitionStatus: function () {
      resolveCurrentlyRenderingComponent();
      return sharedNotPendingObject;
    },
    useMemoCache: function (size) {
      for (var data = Array(size), i = 0; i < size; i++)
        data[i] = REACT_MEMO_CACHE_SENTINEL;
      return data;
    },
    useCacheRefresh: function () {
      return unsupportedRefresh;
    },
    useEffectEvent: function () {
      return throwOnUseEffectEventCall;
    }
  },
  currentResumableState = null,
  DefaultAsyncDispatcher = {
    getCacheForType: function () {
      throw Error(formatProdErrorMessage(248));
    },
    cacheSignal: function () {
      throw Error(formatProdErrorMessage(248));
    }
  },
  prefix,
  suffix;
function describeBuiltInComponentFrame(name) {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x) {
      var match = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn, construct) {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$24) {
                control = x$24;
              }
              fn.call(Fake.prototype);
            }
          } else {
            try {
              throw Error();
            } catch (x$25) {
              control = x$25;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame].replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace)
    : "";
}
function describeComponentStackByType(type) {
  if ("string" === typeof type) return describeBuiltInComponentFrame(type);
  if ("function" === typeof type)
    return type.prototype && type.prototype.isReactComponent
      ? describeNativeComponentFrame(type, !0)
      : describeNativeComponentFrame(type, !1);
  if ("object" === typeof type && null !== type) {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE:
        return describeNativeComponentFrame(type.render, !1);
      case REACT_MEMO_TYPE:
        return describeNativeComponentFrame(type.type, !1);
      case REACT_LAZY_TYPE:
        var lazyComponent = type,
          payload = lazyComponent._payload;
        lazyComponent = lazyComponent._init;
        try {
          type = lazyComponent(payload);
        } catch (x) {
          return describeBuiltInComponentFrame("Lazy");
        }
        return describeComponentStackByType(type);
    }
    if ("string" === typeof type.name) {
      a: {
        payload = type.name;
        lazyComponent = type.env;
        var location = type.debugLocation;
        if (
          null != location &&
          ((type = Error.prepareStackTrace),
          (Error.prepareStackTrace = void 0),
          (location = location.stack),
          (Error.prepareStackTrace = type),
          location.startsWith("Error: react-stack-top-frame\n") &&
            (location = location.slice(29)),
          (type = location.indexOf("\n")),
          -1 !== type && (location = location.slice(type + 1)),
          (type = location.indexOf("react_stack_bottom_frame")),
          -1 !== type && (type = location.lastIndexOf("\n", type)),
          (type = -1 !== type ? (location = location.slice(0, type)) : ""),
          (location = type.lastIndexOf("\n")),
          (type = -1 === location ? type : type.slice(location + 1)),
          -1 !== type.indexOf(payload))
        ) {
          payload = "\n" + type;
          break a;
        }
        payload = describeBuiltInComponentFrame(
          payload + (lazyComponent ? " [" + lazyComponent + "]" : "")
        );
      }
      return payload;
    }
  }
  switch (type) {
    case REACT_SUSPENSE_LIST_TYPE:
      return describeBuiltInComponentFrame("SuspenseList");
    case REACT_SUSPENSE_TYPE:
      return describeBuiltInComponentFrame("Suspense");
  }
  return "";
}
function isEligibleForOutlining(request, boundary) {
  return (
    (500 < boundary.byteSize || hasSuspenseyContent(boundary.contentState)) &&
    null === boundary.contentPreamble
  );
}
function defaultErrorHandler(error) {
  if (
    "object" === typeof error &&
    null !== error &&
    "string" === typeof error.environmentName
  ) {
    var JSCompiler_inline_result = error.environmentName;
    error = [error].slice(0);
    "string" === typeof error[0]
      ? error.splice(
          0,
          1,
          "%c%s%c " + error[0],
          "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px",
          " " + JSCompiler_inline_result + " ",
          ""
        )
      : error.splice(
          0,
          0,
          "%c%s%c",
          "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px",
          " " + JSCompiler_inline_result + " ",
          ""
        );
    error.unshift(console);
    JSCompiler_inline_result = bind.apply(console.error, error);
    JSCompiler_inline_result();
  } else console.error(error);
  return null;
}
function RequestInstance(
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone,
  formState
) {
  var abortSet = new Set();
  this.destination = null;
  this.flushScheduled = !1;
  this.resumableState = resumableState;
  this.renderState = renderState;
  this.rootFormatContext = rootFormatContext;
  this.progressiveChunkSize =
    void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
  this.status = 10;
  this.fatalError = null;
  this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
  this.completedPreambleSegments = this.completedRootSegment = null;
  this.byteSize = 0;
  this.abortableTasks = abortSet;
  this.pingedTasks = [];
  this.clientRenderedBoundaries = [];
  this.completedBoundaries = [];
  this.partialBoundaries = [];
  this.trackedPostpones = null;
  this.onError = void 0 === onError ? defaultErrorHandler : onError;
  this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
  this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
  this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
  this.onShellError = void 0 === onShellError ? noop : onShellError;
  this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
  this.formState = void 0 === formState ? null : formState;
}
function createRequest(
  children,
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone,
  formState
) {
  resumableState = new RequestInstance(
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    onPostpone,
    formState
  );
  renderState = createPendingSegment(
    resumableState,
    0,
    null,
    rootFormatContext,
    !1,
    !1
  );
  renderState.parentFlushed = !0;
  children = createRenderTask(
    resumableState,
    null,
    children,
    -1,
    null,
    renderState,
    null,
    null,
    resumableState.abortableTasks,
    null,
    rootFormatContext,
    null,
    emptyTreeContext,
    null,
    null
  );
  pushComponentStack(children);
  resumableState.pingedTasks.push(children);
  return resumableState;
}
function createPrerenderRequest(
  children,
  resumableState,
  renderState,
  rootFormatContext,
  progressiveChunkSize,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone
) {
  children = createRequest(
    children,
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    onPostpone,
    void 0
  );
  children.trackedPostpones = {
    workingMap: new Map(),
    rootNodes: [],
    rootSlots: null
  };
  return children;
}
function resumeRequest(
  children,
  postponedState,
  renderState,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone
) {
  renderState = new RequestInstance(
    postponedState.resumableState,
    renderState,
    postponedState.rootFormatContext,
    postponedState.progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    onPostpone,
    null
  );
  renderState.nextSegmentId = postponedState.nextSegmentId;
  if ("number" === typeof postponedState.replaySlots)
    return (
      (onError = createPendingSegment(
        renderState,
        0,
        null,
        postponedState.rootFormatContext,
        !1,
        !1
      )),
      (onError.parentFlushed = !0),
      (children = createRenderTask(
        renderState,
        null,
        children,
        -1,
        null,
        onError,
        null,
        null,
        renderState.abortableTasks,
        null,
        postponedState.rootFormatContext,
        null,
        emptyTreeContext,
        null,
        null
      )),
      pushComponentStack(children),
      renderState.pingedTasks.push(children),
      renderState
    );
  children = createReplayTask(
    renderState,
    null,
    {
      nodes: postponedState.replayNodes,
      slots: postponedState.replaySlots,
      pendingTasks: 0
    },
    children,
    -1,
    null,
    null,
    renderState.abortableTasks,
    null,
    postponedState.rootFormatContext,
    null,
    emptyTreeContext,
    null,
    null
  );
  pushComponentStack(children);
  renderState.pingedTasks.push(children);
  return renderState;
}
function resumeAndPrerenderRequest(
  children,
  postponedState,
  renderState,
  onError,
  onAllReady,
  onShellReady,
  onShellError,
  onFatalError,
  onPostpone
) {
  children = resumeRequest(
    children,
    postponedState,
    renderState,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    onPostpone
  );
  children.trackedPostpones = {
    workingMap: new Map(),
    rootNodes: [],
    rootSlots: null
  };
  return children;
}
var currentRequest = null;
function pingTask(request, task) {
  request.pingedTasks.push(task);
  1 === request.pingedTasks.length &&
    ((request.flushScheduled = null !== request.destination),
    null !== request.trackedPostpones || 10 === request.status
      ? scheduleMicrotask(function () {
          return performWork(request);
        })
      : scheduleWork(function () {
          return performWork(request);
        }));
}
function createSuspenseBoundary(
  request,
  row,
  fallbackAbortableTasks,
  contentPreamble,
  fallbackPreamble
) {
  fallbackAbortableTasks = {
    status: 0,
    rootSegmentID: -1,
    parentFlushed: !1,
    pendingTasks: 0,
    row: row,
    completedSegments: [],
    byteSize: 0,
    fallbackAbortableTasks: fallbackAbortableTasks,
    errorDigest: null,
    contentState: createHoistableState(),
    fallbackState: createHoistableState(),
    contentPreamble: contentPreamble,
    fallbackPreamble: fallbackPreamble,
    trackedContentKeyPath: null,
    trackedFallbackNode: null
  };
  null !== row &&
    (row.pendingTasks++,
    (contentPreamble = row.boundaries),
    null !== contentPreamble &&
      (request.allPendingTasks++,
      fallbackAbortableTasks.pendingTasks++,
      contentPreamble.push(fallbackAbortableTasks)),
    (request = row.inheritedHoistables),
    null !== request &&
      hoistHoistables(fallbackAbortableTasks.contentState, request));
  return fallbackAbortableTasks;
}
function createRenderTask(
  request,
  thenableState,
  node,
  childIndex,
  blockedBoundary,
  blockedSegment,
  blockedPreamble,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  var task = {
    replay: null,
    node: node,
    childIndex: childIndex,
    ping: function () {
      return pingTask(request, task);
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: blockedSegment,
    blockedPreamble: blockedPreamble,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  abortSet.add(task);
  return task;
}
function createReplayTask(
  request,
  thenableState,
  replay,
  node,
  childIndex,
  blockedBoundary,
  hoistableState,
  abortSet,
  keyPath,
  formatContext,
  context,
  treeContext,
  row,
  componentStack
) {
  request.allPendingTasks++;
  null === blockedBoundary
    ? request.pendingRootTasks++
    : blockedBoundary.pendingTasks++;
  null !== row && row.pendingTasks++;
  replay.pendingTasks++;
  var task = {
    replay: replay,
    node: node,
    childIndex: childIndex,
    ping: function () {
      return pingTask(request, task);
    },
    blockedBoundary: blockedBoundary,
    blockedSegment: null,
    blockedPreamble: null,
    hoistableState: hoistableState,
    abortSet: abortSet,
    keyPath: keyPath,
    formatContext: formatContext,
    context: context,
    treeContext: treeContext,
    row: row,
    componentStack: componentStack,
    thenableState: thenableState
  };
  abortSet.add(task);
  return task;
}
function createPendingSegment(
  request,
  index,
  boundary,
  parentFormatContext,
  lastPushedText,
  textEmbedded
) {
  return {
    status: 0,
    parentFlushed: !1,
    id: -1,
    index: index,
    chunks: [],
    children: [],
    preambleChildren: [],
    parentFormatContext: parentFormatContext,
    boundary: boundary,
    lastPushedText: lastPushedText,
    textEmbedded: textEmbedded
  };
}
function pushComponentStack(task) {
  var node = task.node;
  if ("object" === typeof node && null !== node)
    switch (node.$$typeof) {
      case REACT_ELEMENT_TYPE:
        task.componentStack = { parent: task.componentStack, type: node.type };
    }
}
function replaceSuspenseComponentStackWithSuspenseFallbackStack(
  componentStack
) {
  return null === componentStack
    ? null
    : { parent: componentStack.parent, type: "Suspense Fallback" };
}
function getThrownInfo(node$jscomp$0) {
  var errorInfo = {};
  node$jscomp$0 &&
    Object.defineProperty(errorInfo, "componentStack", {
      configurable: !0,
      enumerable: !0,
      get: function () {
        try {
          var info = "",
            node = node$jscomp$0;
          do
            (info += describeComponentStackByType(node.type)),
              (node = node.parent);
          while (node);
          var JSCompiler_inline_result = info;
        } catch (x) {
          JSCompiler_inline_result =
            "\nError generating stack: " + x.message + "\n" + x.stack;
        }
        Object.defineProperty(errorInfo, "componentStack", {
          value: JSCompiler_inline_result
        });
        return JSCompiler_inline_result;
      }
    });
  return errorInfo;
}
function logRecoverableError(request, error, errorInfo) {
  request = request.onError;
  error = request(error, errorInfo);
  if (null == error || "string" === typeof error) return error;
}
function fatalError(request, error) {
  var onShellError = request.onShellError,
    onFatalError = request.onFatalError;
  onShellError(error);
  onFatalError(error);
  null !== request.destination
    ? ((request.status = 14), closeWithError(request.destination, error))
    : ((request.status = 13), (request.fatalError = error));
}
function finishSuspenseListRow(request, row) {
  unblockSuspenseListRow(request, row.next, row.hoistables);
}
function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
  for (; null !== unblockedRow; ) {
    null !== inheritedHoistables &&
      (hoistHoistables(unblockedRow.hoistables, inheritedHoistables),
      (unblockedRow.inheritedHoistables = inheritedHoistables));
    var unblockedBoundaries = unblockedRow.boundaries;
    if (null !== unblockedBoundaries) {
      unblockedRow.boundaries = null;
      for (var i = 0; i < unblockedBoundaries.length; i++) {
        var unblockedBoundary = unblockedBoundaries[i];
        null !== inheritedHoistables &&
          hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
        finishedTask(request, unblockedBoundary, null, null);
      }
    }
    unblockedRow.pendingTasks--;
    if (0 < unblockedRow.pendingTasks) break;
    inheritedHoistables = unblockedRow.hoistables;
    unblockedRow = unblockedRow.next;
  }
}
function tryToResolveTogetherRow(request, togetherRow) {
  var boundaries = togetherRow.boundaries;
  if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
    for (var allCompleteAndInlinable = !0, i = 0; i < boundaries.length; i++) {
      var rowBoundary = boundaries[i];
      if (
        1 !== rowBoundary.pendingTasks ||
        rowBoundary.parentFlushed ||
        isEligibleForOutlining(request, rowBoundary)
      ) {
        allCompleteAndInlinable = !1;
        break;
      }
    }
    allCompleteAndInlinable &&
      unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
  }
}
function createSuspenseListRow(previousRow) {
  var newRow = {
    pendingTasks: 1,
    boundaries: null,
    hoistables: createHoistableState(),
    inheritedHoistables: null,
    together: !1,
    next: null
  };
  null !== previousRow &&
    0 < previousRow.pendingTasks &&
    (newRow.pendingTasks++,
    (newRow.boundaries = []),
    (previousRow.next = newRow));
  return newRow;
}
function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
  var prevKeyPath = task.keyPath,
    prevTreeContext = task.treeContext,
    prevRow = task.row;
  task.keyPath = keyPath;
  keyPath = rows.length;
  var previousSuspenseListRow = null;
  if (null !== task.replay) {
    var resumeSlots = task.replay.slots;
    if (null !== resumeSlots && "object" === typeof resumeSlots)
      for (var n = 0; n < keyPath; n++) {
        var i =
            "backwards" !== revealOrder &&
            "unstable_legacy-backwards" !== revealOrder
              ? n
              : keyPath - 1 - n,
          node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow
        );
        task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
        var resumeSegmentID = resumeSlots[i];
        "number" === typeof resumeSegmentID
          ? (resumeNode(request, task, resumeSegmentID, node, i),
            delete resumeSlots[i])
          : renderNode(request, task, node, i);
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
      }
    else
      for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++)
        (n =
          "backwards" !== revealOrder &&
          "unstable_legacy-backwards" !== revealOrder
            ? resumeSlots
            : keyPath - 1 - resumeSlots),
          (i = rows[n]),
          (task.row = previousSuspenseListRow =
            createSuspenseListRow(previousSuspenseListRow)),
          (task.treeContext = pushTreeContext(prevTreeContext, keyPath, n)),
          renderNode(request, task, i, n),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
  } else if (
    "backwards" !== revealOrder &&
    "unstable_legacy-backwards" !== revealOrder
  )
    for (revealOrder = 0; revealOrder < keyPath; revealOrder++)
      (resumeSlots = rows[revealOrder]),
        (task.row = previousSuspenseListRow =
          createSuspenseListRow(previousSuspenseListRow)),
        (task.treeContext = pushTreeContext(
          prevTreeContext,
          keyPath,
          revealOrder
        )),
        renderNode(request, task, resumeSlots, revealOrder),
        0 === --previousSuspenseListRow.pendingTasks &&
          finishSuspenseListRow(request, previousSuspenseListRow);
  else {
    revealOrder = task.blockedSegment;
    resumeSlots = revealOrder.children.length;
    n = revealOrder.chunks.length;
    for (i = keyPath - 1; 0 <= i; i--) {
      node = rows[i];
      task.row = previousSuspenseListRow = createSuspenseListRow(
        previousSuspenseListRow
      );
      task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
      resumeSegmentID = createPendingSegment(
        request,
        n,
        null,
        task.formatContext,
        0 === i ? revealOrder.lastPushedText : !0,
        !0
      );
      revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
      task.blockedSegment = resumeSegmentID;
      try {
        renderNode(request, task, node, i),
          resumeSegmentID.lastPushedText &&
            resumeSegmentID.textEmbedded &&
            resumeSegmentID.chunks.push(textSeparator),
          (resumeSegmentID.status = 1),
          finishedSegment(request, task.blockedBoundary, resumeSegmentID),
          0 === --previousSuspenseListRow.pendingTasks &&
            finishSuspenseListRow(request, previousSuspenseListRow);
      } catch (thrownValue) {
        throw (
          ((resumeSegmentID.status = 12 === request.status ? 3 : 4),
          thrownValue)
        );
      }
    }
    task.blockedSegment = revealOrder;
    revealOrder.lastPushedText = !1;
  }
  null !== prevRow &&
    null !== previousSuspenseListRow &&
    0 < previousSuspenseListRow.pendingTasks &&
    (prevRow.pendingTasks++, (previousSuspenseListRow.next = prevRow));
  task.treeContext = prevTreeContext;
  task.row = prevRow;
  task.keyPath = prevKeyPath;
}
function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
  var prevThenableState = task.thenableState;
  task.thenableState = null;
  currentlyRenderingComponent = {};
  currentlyRenderingTask = task;
  currentlyRenderingRequest = request;
  currentlyRenderingKeyPath = keyPath;
  actionStateCounter = localIdCounter = 0;
  actionStateMatchingIndex = -1;
  thenableIndexCounter = 0;
  thenableState = prevThenableState;
  for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate; )
    (didScheduleRenderPhaseUpdate = !1),
      (actionStateCounter = localIdCounter = 0),
      (actionStateMatchingIndex = -1),
      (thenableIndexCounter = 0),
      (numberOfReRenders += 1),
      (workInProgressHook = null),
      (request = Component(props, secondArg));
  resetHooksState();
  return request;
}
function finishFunctionComponent(
  request,
  task,
  keyPath,
  children,
  hasId,
  actionStateCount,
  actionStateMatchingIndex
) {
  var didEmitActionStateMarkers = !1;
  if (0 !== actionStateCount && null !== request.formState) {
    var segment = task.blockedSegment;
    if (null !== segment) {
      didEmitActionStateMarkers = !0;
      segment = segment.chunks;
      for (var i = 0; i < actionStateCount; i++)
        i === actionStateMatchingIndex
          ? segment.push(formStateMarkerIsMatching)
          : segment.push(formStateMarkerIsNotMatching);
    }
  }
  actionStateCount = task.keyPath;
  task.keyPath = keyPath;
  hasId
    ? ((keyPath = task.treeContext),
      (task.treeContext = pushTreeContext(keyPath, 1, 0)),
      renderNode(request, task, children, -1),
      (task.treeContext = keyPath))
    : didEmitActionStateMarkers
      ? renderNode(request, task, children, -1)
      : renderNodeDestructive(request, task, children, -1);
  task.keyPath = actionStateCount;
}
function renderElement(request, task, keyPath, type, props, ref) {
  if ("function" === typeof type)
    if (type.prototype && type.prototype.isReactComponent) {
      var newProps = props;
      if ("ref" in props) {
        newProps = {};
        for (var propName in props)
          "ref" !== propName && (newProps[propName] = props[propName]);
      }
      var defaultProps = type.defaultProps;
      if (defaultProps) {
        newProps === props && (newProps = assign({}, newProps, props));
        for (var propName$44 in defaultProps)
          void 0 === newProps[propName$44] &&
            (newProps[propName$44] = defaultProps[propName$44]);
      }
      props = newProps;
      newProps = emptyContextObject;
      defaultProps = type.contextType;
      "object" === typeof defaultProps &&
        null !== defaultProps &&
        (newProps = defaultProps._currentValue);
      newProps = new type(props, newProps);
      var initialState = void 0 !== newProps.state ? newProps.state : null;
      newProps.updater = classComponentUpdater;
      newProps.props = props;
      newProps.state = initialState;
      defaultProps = { queue: [], replace: !1 };
      newProps._reactInternals = defaultProps;
      ref = type.contextType;
      newProps.context =
        "object" === typeof ref && null !== ref
          ? ref._currentValue
          : emptyContextObject;
      ref = type.getDerivedStateFromProps;
      "function" === typeof ref &&
        ((ref = ref(props, initialState)),
        (initialState =
          null === ref || void 0 === ref
            ? initialState
            : assign({}, initialState, ref)),
        (newProps.state = initialState));
      if (
        "function" !== typeof type.getDerivedStateFromProps &&
        "function" !== typeof newProps.getSnapshotBeforeUpdate &&
        ("function" === typeof newProps.UNSAFE_componentWillMount ||
          "function" === typeof newProps.componentWillMount)
      )
        if (
          ((type = newProps.state),
          "function" === typeof newProps.componentWillMount &&
            newProps.componentWillMount(),
          "function" === typeof newProps.UNSAFE_componentWillMount &&
            newProps.UNSAFE_componentWillMount(),
          type !== newProps.state &&
            classComponentUpdater.enqueueReplaceState(
              newProps,
              newProps.state,
              null
            ),
          null !== defaultProps.queue && 0 < defaultProps.queue.length)
        )
          if (
            ((type = defaultProps.queue),
            (ref = defaultProps.replace),
            (defaultProps.queue = null),
            (defaultProps.replace = !1),
            ref && 1 === type.length)
          )
            newProps.state = type[0];
          else {
            defaultProps = ref ? type[0] : newProps.state;
            initialState = !0;
            for (ref = ref ? 1 : 0; ref < type.length; ref++)
              (propName$44 = type[ref]),
                (propName$44 =
                  "function" === typeof propName$44
                    ? propName$44.call(newProps, defaultProps, props, void 0)
                    : propName$44),
                null != propName$44 &&
                  (initialState
                    ? ((initialState = !1),
                      (defaultProps = assign({}, defaultProps, propName$44)))
                    : assign(defaultProps, propName$44));
            newProps.state = defaultProps;
          }
        else defaultProps.queue = null;
      type = newProps.render();
      if (12 === request.status) throw null;
      props = task.keyPath;
      task.keyPath = keyPath;
      renderNodeDestructive(request, task, type, -1);
      task.keyPath = props;
    } else {
      type = renderWithHooks(request, task, keyPath, type, props, void 0);
      if (12 === request.status) throw null;
      finishFunctionComponent(
        request,
        task,
        keyPath,
        type,
        0 !== localIdCounter,
        actionStateCounter,
        actionStateMatchingIndex
      );
    }
  else if ("string" === typeof type)
    if (((newProps = task.blockedSegment), null === newProps))
      (newProps = props.children),
        (defaultProps = task.formatContext),
        (initialState = task.keyPath),
        (task.formatContext = getChildFormatContext(defaultProps, type, props)),
        (task.keyPath = keyPath),
        renderNode(request, task, newProps, -1),
        (task.formatContext = defaultProps),
        (task.keyPath = initialState);
    else {
      initialState = pushStartInstance(
        newProps.chunks,
        type,
        props,
        request.resumableState,
        request.renderState,
        task.blockedPreamble,
        task.hoistableState,
        task.formatContext,
        newProps.lastPushedText
      );
      newProps.lastPushedText = !1;
      defaultProps = task.formatContext;
      ref = task.keyPath;
      task.keyPath = keyPath;
      if (
        3 ===
        (task.formatContext = getChildFormatContext(defaultProps, type, props))
          .insertionMode
      ) {
        keyPath = createPendingSegment(
          request,
          0,
          null,
          task.formatContext,
          !1,
          !1
        );
        newProps.preambleChildren.push(keyPath);
        task.blockedSegment = keyPath;
        try {
          (keyPath.status = 6),
            renderNode(request, task, initialState, -1),
            keyPath.lastPushedText &&
              keyPath.textEmbedded &&
              keyPath.chunks.push(textSeparator),
            (keyPath.status = 1),
            finishedSegment(request, task.blockedBoundary, keyPath);
        } finally {
          task.blockedSegment = newProps;
        }
      } else renderNode(request, task, initialState, -1);
      task.formatContext = defaultProps;
      task.keyPath = ref;
      a: {
        task = newProps.chunks;
        request = request.resumableState;
        switch (type) {
          case "title":
          case "style":
          case "script":
          case "area":
          case "base":
          case "br":
          case "col":
          case "embed":
          case "hr":
          case "img":
          case "input":
          case "keygen":
          case "link":
          case "meta":
          case "param":
          case "source":
          case "track":
          case "wbr":
            break a;
          case "body":
            if (1 >= defaultProps.insertionMode) {
              request.hasBody = !0;
              break a;
            }
            break;
          case "html":
            if (0 === defaultProps.insertionMode) {
              request.hasHtml = !0;
              break a;
            }
            break;
          case "head":
            if (1 >= defaultProps.insertionMode) break a;
        }
        task.push(endChunkForTag(type));
      }
      newProps.lastPushedText = !1;
    }
  else {
    switch (type) {
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_STRICT_MODE_TYPE:
      case REACT_PROFILER_TYPE:
      case REACT_FRAGMENT_TYPE:
        type = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, props.children, -1);
        task.keyPath = type;
        return;
      case REACT_ACTIVITY_TYPE:
        type = task.blockedSegment;
        null === type
          ? "hidden" !== props.mode &&
            ((type = task.keyPath),
            (task.keyPath = keyPath),
            renderNode(request, task, props.children, -1),
            (task.keyPath = type))
          : "hidden" !== props.mode &&
            (type.chunks.push(startActivityBoundary),
            (type.lastPushedText = !1),
            (newProps = task.keyPath),
            (task.keyPath = keyPath),
            renderNode(request, task, props.children, -1),
            (task.keyPath = newProps),
            type.chunks.push(endActivityBoundary),
            (type.lastPushedText = !1));
        return;
      case REACT_SUSPENSE_LIST_TYPE:
        a: {
          type = props.children;
          props = props.revealOrder;
          if (
            "forwards" === props ||
            "backwards" === props ||
            "unstable_legacy-backwards" === props
          ) {
            if (isArrayImpl(type)) {
              renderSuspenseListRows(request, task, keyPath, type, props);
              break a;
            }
            if ((newProps = getIteratorFn(type)))
              if ((newProps = newProps.call(type))) {
                defaultProps = newProps.next();
                if (!defaultProps.done) {
                  do defaultProps = newProps.next();
                  while (!defaultProps.done);
                  renderSuspenseListRows(request, task, keyPath, type, props);
                }
                break a;
              }
          }
          "together" === props
            ? ((props = task.keyPath),
              (newProps = task.row),
              (defaultProps = task.row = createSuspenseListRow(null)),
              (defaultProps.boundaries = []),
              (defaultProps.together = !0),
              (task.keyPath = keyPath),
              renderNodeDestructive(request, task, type, -1),
              0 === --defaultProps.pendingTasks &&
                finishSuspenseListRow(request, defaultProps),
              (task.keyPath = props),
              (task.row = newProps),
              null !== newProps &&
                0 < defaultProps.pendingTasks &&
                (newProps.pendingTasks++, (defaultProps.next = newProps)))
            : ((props = task.keyPath),
              (task.keyPath = keyPath),
              renderNodeDestructive(request, task, type, -1),
              (task.keyPath = props));
        }
        return;
      case REACT_VIEW_TRANSITION_TYPE:
      case REACT_SCOPE_TYPE:
        throw Error(formatProdErrorMessage(343));
      case REACT_SUSPENSE_TYPE:
        a: if (null !== task.replay) {
          type = task.keyPath;
          newProps = task.formatContext;
          defaultProps = task.row;
          task.keyPath = keyPath;
          task.formatContext = getSuspenseContentFormatContext(
            request.resumableState,
            newProps
          );
          task.row = null;
          keyPath = props.children;
          try {
            renderNode(request, task, keyPath, -1);
          } finally {
            (task.keyPath = type),
              (task.formatContext = newProps),
              (task.row = defaultProps);
          }
        } else {
          type = task.keyPath;
          ref = task.formatContext;
          var prevRow = task.row;
          propName$44 = task.blockedBoundary;
          propName = task.blockedPreamble;
          var parentHoistableState = task.hoistableState,
            parentSegment = task.blockedSegment,
            fallback = props.fallback;
          props = props.children;
          var fallbackAbortSet = new Set();
          var newBoundary =
            2 > task.formatContext.insertionMode
              ? createSuspenseBoundary(
                  request,
                  task.row,
                  fallbackAbortSet,
                  createPreambleState(),
                  createPreambleState()
                )
              : createSuspenseBoundary(
                  request,
                  task.row,
                  fallbackAbortSet,
                  null,
                  null
                );
          null !== request.trackedPostpones &&
            (newBoundary.trackedContentKeyPath = keyPath);
          var boundarySegment = createPendingSegment(
            request,
            parentSegment.chunks.length,
            newBoundary,
            task.formatContext,
            !1,
            !1
          );
          parentSegment.children.push(boundarySegment);
          parentSegment.lastPushedText = !1;
          var contentRootSegment = createPendingSegment(
            request,
            0,
            null,
            task.formatContext,
            !1,
            !1
          );
          contentRootSegment.parentFlushed = !0;
          if (null !== request.trackedPostpones) {
            newProps = task.componentStack;
            defaultProps = [keyPath[0], "Suspense Fallback", keyPath[2]];
            initialState = [defaultProps[1], defaultProps[2], [], null];
            request.trackedPostpones.workingMap.set(defaultProps, initialState);
            newBoundary.trackedFallbackNode = initialState;
            task.blockedSegment = boundarySegment;
            task.blockedPreamble = newBoundary.fallbackPreamble;
            task.keyPath = defaultProps;
            task.formatContext = getSuspenseFallbackFormatContext(
              request.resumableState,
              ref
            );
            task.componentStack =
              replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
            boundarySegment.status = 6;
            try {
              renderNode(request, task, fallback, -1),
                boundarySegment.lastPushedText &&
                  boundarySegment.textEmbedded &&
                  boundarySegment.chunks.push(textSeparator),
                (boundarySegment.status = 1),
                finishedSegment(request, propName$44, boundarySegment);
            } catch (thrownValue) {
              throw (
                ((boundarySegment.status = 12 === request.status ? 3 : 4),
                thrownValue)
              );
            } finally {
              (task.blockedSegment = parentSegment),
                (task.blockedPreamble = propName),
                (task.keyPath = type),
                (task.formatContext = ref);
            }
            task = createRenderTask(
              request,
              null,
              props,
              -1,
              newBoundary,
              contentRootSegment,
              newBoundary.contentPreamble,
              newBoundary.contentState,
              task.abortSet,
              keyPath,
              getSuspenseContentFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              null,
              newProps
            );
            pushComponentStack(task);
            request.pingedTasks.push(task);
          } else {
            task.blockedBoundary = newBoundary;
            task.blockedPreamble = newBoundary.contentPreamble;
            task.hoistableState = newBoundary.contentState;
            task.blockedSegment = contentRootSegment;
            task.keyPath = keyPath;
            task.formatContext = getSuspenseContentFormatContext(
              request.resumableState,
              ref
            );
            task.row = null;
            contentRootSegment.status = 6;
            try {
              if (
                (renderNode(request, task, props, -1),
                contentRootSegment.lastPushedText &&
                  contentRootSegment.textEmbedded &&
                  contentRootSegment.chunks.push(textSeparator),
                (contentRootSegment.status = 1),
                finishedSegment(request, newBoundary, contentRootSegment),
                queueCompletedSegment(newBoundary, contentRootSegment),
                0 === newBoundary.pendingTasks && 0 === newBoundary.status)
              ) {
                if (
                  ((newBoundary.status = 1),
                  !isEligibleForOutlining(request, newBoundary))
                ) {
                  null !== prevRow &&
                    0 === --prevRow.pendingTasks &&
                    finishSuspenseListRow(request, prevRow);
                  0 === request.pendingRootTasks &&
                    task.blockedPreamble &&
                    preparePreamble(request);
                  break a;
                }
              } else
                null !== prevRow &&
                  prevRow.together &&
                  tryToResolveTogetherRow(request, prevRow);
            } catch (thrownValue$31) {
              (newBoundary.status = 4),
                12 === request.status
                  ? ((contentRootSegment.status = 3),
                    (newProps = request.fatalError))
                  : ((contentRootSegment.status = 4),
                    (newProps = thrownValue$31)),
                (defaultProps = getThrownInfo(task.componentStack)),
                (initialState = logRecoverableError(
                  request,
                  newProps,
                  defaultProps
                )),
                (newBoundary.errorDigest = initialState),
                untrackBoundary(request, newBoundary);
            } finally {
              (task.blockedBoundary = propName$44),
                (task.blockedPreamble = propName),
                (task.hoistableState = parentHoistableState),
                (task.blockedSegment = parentSegment),
                (task.keyPath = type),
                (task.formatContext = ref),
                (task.row = prevRow);
            }
            task = createRenderTask(
              request,
              null,
              fallback,
              -1,
              propName$44,
              boundarySegment,
              newBoundary.fallbackPreamble,
              newBoundary.fallbackState,
              fallbackAbortSet,
              [keyPath[0], "Suspense Fallback", keyPath[2]],
              getSuspenseFallbackFormatContext(
                request.resumableState,
                task.formatContext
              ),
              task.context,
              task.treeContext,
              task.row,
              replaceSuspenseComponentStackWithSuspenseFallbackStack(
                task.componentStack
              )
            );
            pushComponentStack(task);
            request.pingedTasks.push(task);
          }
        }
        return;
    }
    if ("object" === typeof type && null !== type)
      switch (type.$$typeof) {
        case REACT_FORWARD_REF_TYPE:
          if ("ref" in props)
            for (parentSegment in ((newProps = {}), props))
              "ref" !== parentSegment &&
                (newProps[parentSegment] = props[parentSegment]);
          else newProps = props;
          type = renderWithHooks(
            request,
            task,
            keyPath,
            type.render,
            newProps,
            ref
          );
          finishFunctionComponent(
            request,
            task,
            keyPath,
            type,
            0 !== localIdCounter,
            actionStateCounter,
            actionStateMatchingIndex
          );
          return;
        case REACT_MEMO_TYPE:
          renderElement(request, task, keyPath, type.type, props, ref);
          return;
        case REACT_CONTEXT_TYPE:
          defaultProps = props.children;
          newProps = task.keyPath;
          props = props.value;
          initialState = type._currentValue;
          type._currentValue = props;
          ref = currentActiveSnapshot;
          currentActiveSnapshot = type = {
            parent: ref,
            depth: null === ref ? 0 : ref.depth + 1,
            context: type,
            parentValue: initialState,
            value: props
          };
          task.context = type;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, defaultProps, -1);
          request = currentActiveSnapshot;
          if (null === request) throw Error(formatProdErrorMessage(403));
          request.context._currentValue = request.parentValue;
          request = currentActiveSnapshot = request.parent;
          task.context = request;
          task.keyPath = newProps;
          return;
        case REACT_CONSUMER_TYPE:
          props = props.children;
          type = props(type._context._currentValue);
          props = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, type, -1);
          task.keyPath = props;
          return;
        case REACT_LAZY_TYPE:
          newProps = type._init;
          type = newProps(type._payload);
          if (12 === request.status) throw null;
          renderElement(request, task, keyPath, type, props, ref);
          return;
      }
    throw Error(
      formatProdErrorMessage(130, null == type ? type : typeof type, "")
    );
  }
}
function resumeNode(request, task, segmentId, node, childIndex) {
  var prevReplay = task.replay,
    blockedBoundary = task.blockedBoundary,
    resumedSegment = createPendingSegment(
      request,
      0,
      null,
      task.formatContext,
      !1,
      !1
    );
  resumedSegment.id = segmentId;
  resumedSegment.parentFlushed = !0;
  try {
    (task.replay = null),
      (task.blockedSegment = resumedSegment),
      renderNode(request, task, node, childIndex),
      (resumedSegment.status = 1),
      finishedSegment(request, blockedBoundary, resumedSegment),
      null === blockedBoundary
        ? (request.completedRootSegment = resumedSegment)
        : (queueCompletedSegment(blockedBoundary, resumedSegment),
          blockedBoundary.parentFlushed &&
            request.partialBoundaries.push(blockedBoundary));
  } finally {
    (task.replay = prevReplay), (task.blockedSegment = null);
  }
}
function renderNodeDestructive(request, task, node, childIndex) {
  null !== task.replay && "number" === typeof task.replay.slots
    ? resumeNode(request, task, task.replay.slots, node, childIndex)
    : ((task.node = node),
      (task.childIndex = childIndex),
      (node = task.componentStack),
      pushComponentStack(task),
      retryNode(request, task),
      (task.componentStack = node));
}
function retryNode(request, task) {
  var node = task.node,
    childIndex = task.childIndex;
  if (null !== node) {
    if ("object" === typeof node) {
      switch (node.$$typeof) {
        case REACT_ELEMENT_TYPE:
          var type = node.type,
            key = node.key,
            props = node.props;
          node = props.ref;
          var ref = void 0 !== node ? node : null,
            name = getComponentNameFromType(type),
            keyOrIndex =
              null == key ? (-1 === childIndex ? 0 : childIndex) : key;
          key = [task.keyPath, name, keyOrIndex];
          if (null !== task.replay)
            a: {
              var replay = task.replay;
              childIndex = replay.nodes;
              for (node = 0; node < childIndex.length; node++) {
                var node$jscomp$0 = childIndex[node];
                if (keyOrIndex === node$jscomp$0[1]) {
                  if (4 === node$jscomp$0.length) {
                    if (null !== name && name !== node$jscomp$0[0])
                      throw Error(
                        formatProdErrorMessage(490, node$jscomp$0[0], name)
                      );
                    var childNodes = node$jscomp$0[2];
                    name = node$jscomp$0[3];
                    keyOrIndex = task.node;
                    task.replay = {
                      nodes: childNodes,
                      slots: name,
                      pendingTasks: 1
                    };
                    try {
                      renderElement(request, task, key, type, props, ref);
                      if (
                        1 === task.replay.pendingTasks &&
                        0 < task.replay.nodes.length
                      )
                        throw Error(formatProdErrorMessage(488));
                      task.replay.pendingTasks--;
                    } catch (x) {
                      if (
                        "object" === typeof x &&
                        null !== x &&
                        (x === SuspenseException ||
                          "function" === typeof x.then)
                      )
                        throw (
                          (task.node === keyOrIndex
                            ? (task.replay = replay)
                            : childIndex.splice(node, 1),
                          x)
                        );
                      task.replay.pendingTasks--;
                      props = getThrownInfo(task.componentStack);
                      key = request;
                      request = task.blockedBoundary;
                      type = x;
                      props = logRecoverableError(key, type, props);
                      abortRemainingReplayNodes(
                        key,
                        request,
                        childNodes,
                        name,
                        type,
                        props
                      );
                    }
                    task.replay = replay;
                  } else {
                    if (type !== REACT_SUSPENSE_TYPE)
                      throw Error(
                        formatProdErrorMessage(
                          490,
                          "Suspense",
                          getComponentNameFromType(type) || "Unknown"
                        )
                      );
                    b: {
                      replay = void 0;
                      type = node$jscomp$0[5];
                      ref = node$jscomp$0[2];
                      name = node$jscomp$0[3];
                      keyOrIndex =
                        null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
                      node$jscomp$0 =
                        null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
                      var prevKeyPath = task.keyPath,
                        prevContext = task.formatContext,
                        prevRow = task.row,
                        previousReplaySet = task.replay,
                        parentBoundary = task.blockedBoundary,
                        parentHoistableState = task.hoistableState,
                        content = props.children,
                        fallback = props.fallback,
                        fallbackAbortSet = new Set();
                      props =
                        2 > task.formatContext.insertionMode
                          ? createSuspenseBoundary(
                              request,
                              task.row,
                              fallbackAbortSet,
                              createPreambleState(),
                              createPreambleState()
                            )
                          : createSuspenseBoundary(
                              request,
                              task.row,
                              fallbackAbortSet,
                              null,
                              null
                            );
                      props.parentFlushed = !0;
                      props.rootSegmentID = type;
                      task.blockedBoundary = props;
                      task.hoistableState = props.contentState;
                      task.keyPath = key;
                      task.formatContext = getSuspenseContentFormatContext(
                        request.resumableState,
                        prevContext
                      );
                      task.row = null;
                      task.replay = {
                        nodes: ref,
                        slots: name,
                        pendingTasks: 1
                      };
                      try {
                        renderNode(request, task, content, -1);
                        if (
                          1 === task.replay.pendingTasks &&
                          0 < task.replay.nodes.length
                        )
                          throw Error(formatProdErrorMessage(488));
                        task.replay.pendingTasks--;
                        if (0 === props.pendingTasks && 0 === props.status) {
                          props.status = 1;
                          request.completedBoundaries.push(props);
                          break b;
                        }
                      } catch (error) {
                        (props.status = 4),
                          (childNodes = getThrownInfo(task.componentStack)),
                          (replay = logRecoverableError(
                            request,
                            error,
                            childNodes
                          )),
                          (props.errorDigest = replay),
                          task.replay.pendingTasks--,
                          request.clientRenderedBoundaries.push(props);
                      } finally {
                        (task.blockedBoundary = parentBoundary),
                          (task.hoistableState = parentHoistableState),
                          (task.replay = previousReplaySet),
                          (task.keyPath = prevKeyPath),
                          (task.formatContext = prevContext),
                          (task.row = prevRow);
                      }
                      childNodes = createReplayTask(
                        request,
                        null,
                        {
                          nodes: keyOrIndex,
                          slots: node$jscomp$0,
                          pendingTasks: 0
                        },
                        fallback,
                        -1,
                        parentBoundary,
                        props.fallbackState,
                        fallbackAbortSet,
                        [key[0], "Suspense Fallback", key[2]],
                        getSuspenseFallbackFormatContext(
                          request.resumableState,
                          task.formatContext
                        ),
                        task.context,
                        task.treeContext,
                        task.row,
                        replaceSuspenseComponentStackWithSuspenseFallbackStack(
                          task.componentStack
                        )
                      );
                      pushComponentStack(childNodes);
                      request.pingedTasks.push(childNodes);
                    }
                  }
                  childIndex.splice(node, 1);
                  break a;
                }
              }
            }
          else renderElement(request, task, key, type, props, ref);
          return;
        case REACT_PORTAL_TYPE:
          throw Error(formatProdErrorMessage(257));
        case REACT_LAZY_TYPE:
          childNodes = node._init;
          node = childNodes(node._payload);
          if (12 === request.status) throw null;
          renderNodeDestructive(request, task, node, childIndex);
          return;
      }
      if (isArrayImpl(node)) {
        renderChildrenArray(request, task, node, childIndex);
        return;
      }
      if ((childNodes = getIteratorFn(node)))
        if ((childNodes = childNodes.call(node))) {
          node = childNodes.next();
          if (!node.done) {
            props = [];
            do props.push(node.value), (node = childNodes.next());
            while (!node.done);
            renderChildrenArray(request, task, props, childIndex);
          }
          return;
        }
      if ("function" === typeof node.then)
        return (
          (task.thenableState = null),
          renderNodeDestructive(request, task, unwrapThenable(node), childIndex)
        );
      if (node.$$typeof === REACT_CONTEXT_TYPE)
        return renderNodeDestructive(
          request,
          task,
          node._currentValue,
          childIndex
        );
      childIndex = Object.prototype.toString.call(node);
      throw Error(
        formatProdErrorMessage(
          31,
          "[object Object]" === childIndex
            ? "object with keys {" + Object.keys(node).join(", ") + "}"
            : childIndex
        )
      );
    }
    if ("string" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            node,
            request.renderState,
            childIndex.lastPushedText
          ));
    else if ("number" === typeof node || "bigint" === typeof node)
      (childIndex = task.blockedSegment),
        null !== childIndex &&
          (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            "" + node,
            request.renderState,
            childIndex.lastPushedText
          ));
  }
}
function renderChildrenArray(request, task, children, childIndex) {
  var prevKeyPath = task.keyPath;
  if (
    -1 !== childIndex &&
    ((task.keyPath = [task.keyPath, "Fragment", childIndex]),
    null !== task.replay)
  ) {
    for (
      var replay = task.replay, replayNodes = replay.nodes, j = 0;
      j < replayNodes.length;
      j++
    ) {
      var node = replayNodes[j];
      if (node[1] === childIndex) {
        childIndex = node[2];
        node = node[3];
        task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
        try {
          renderChildrenArray(request, task, children, -1);
          if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
            throw Error(formatProdErrorMessage(488));
          task.replay.pendingTasks--;
        } catch (x) {
          if (
            "object" === typeof x &&
            null !== x &&
            (x === SuspenseException || "function" === typeof x.then)
          )
            throw x;
          task.replay.pendingTasks--;
          children = getThrownInfo(task.componentStack);
          var boundary = task.blockedBoundary,
            error = x;
          children = logRecoverableError(request, error, children);
          abortRemainingReplayNodes(
            request,
            boundary,
            childIndex,
            node,
            error,
            children
          );
        }
        task.replay = replay;
        replayNodes.splice(j, 1);
        break;
      }
    }
    task.keyPath = prevKeyPath;
    return;
  }
  replay = task.treeContext;
  replayNodes = children.length;
  if (
    null !== task.replay &&
    ((j = task.replay.slots), null !== j && "object" === typeof j)
  ) {
    for (childIndex = 0; childIndex < replayNodes; childIndex++)
      (node = children[childIndex]),
        (task.treeContext = pushTreeContext(replay, replayNodes, childIndex)),
        (boundary = j[childIndex]),
        "number" === typeof boundary
          ? (resumeNode(request, task, boundary, node, childIndex),
            delete j[childIndex])
          : renderNode(request, task, node, childIndex);
    task.treeContext = replay;
    task.keyPath = prevKeyPath;
    return;
  }
  for (j = 0; j < replayNodes; j++)
    (childIndex = children[j]),
      (task.treeContext = pushTreeContext(replay, replayNodes, j)),
      renderNode(request, task, childIndex, j);
  task.treeContext = replay;
  task.keyPath = prevKeyPath;
}
function trackPostponedBoundary(request, trackedPostpones, boundary) {
  boundary.status = 5;
  boundary.rootSegmentID = request.nextSegmentId++;
  request = boundary.trackedContentKeyPath;
  if (null === request) throw Error(formatProdErrorMessage(486));
  var fallbackReplayNode = boundary.trackedFallbackNode,
    children = [],
    boundaryNode = trackedPostpones.workingMap.get(request);
  if (void 0 === boundaryNode)
    return (
      (boundary = [
        request[1],
        request[2],
        children,
        null,
        fallbackReplayNode,
        boundary.rootSegmentID
      ]),
      trackedPostpones.workingMap.set(request, boundary),
      addToReplayParent(boundary, request[0], trackedPostpones),
      boundary
    );
  boundaryNode[4] = fallbackReplayNode;
  boundaryNode[5] = boundary.rootSegmentID;
  return boundaryNode;
}
function trackPostpone(request, trackedPostpones, task, segment) {
  segment.status = 5;
  var keyPath = task.keyPath,
    boundary = task.blockedBoundary;
  if (null === boundary)
    (segment.id = request.nextSegmentId++),
      (trackedPostpones.rootSlots = segment.id),
      null !== request.completedRootSegment &&
        (request.completedRootSegment.status = 5);
  else {
    if (null !== boundary && 0 === boundary.status) {
      var boundaryNode = trackPostponedBoundary(
        request,
        trackedPostpones,
        boundary
      );
      if (
        boundary.trackedContentKeyPath === keyPath &&
        -1 === task.childIndex
      ) {
        -1 === segment.id &&
          (segment.id = segment.parentFlushed
            ? boundary.rootSegmentID
            : request.nextSegmentId++);
        boundaryNode[3] = segment.id;
        return;
      }
    }
    -1 === segment.id &&
      (segment.id =
        segment.parentFlushed && null !== boundary
          ? boundary.rootSegmentID
          : request.nextSegmentId++);
    if (-1 === task.childIndex)
      null === keyPath
        ? (trackedPostpones.rootSlots = segment.id)
        : ((task = trackedPostpones.workingMap.get(keyPath)),
          void 0 === task
            ? ((task = [keyPath[1], keyPath[2], [], segment.id]),
              addToReplayParent(task, keyPath[0], trackedPostpones))
            : (task[3] = segment.id));
    else {
      if (null === keyPath)
        if (((request = trackedPostpones.rootSlots), null === request))
          request = trackedPostpones.rootSlots = {};
        else {
          if ("number" === typeof request)
            throw Error(formatProdErrorMessage(491));
        }
      else if (
        ((boundary = trackedPostpones.workingMap),
        (boundaryNode = boundary.get(keyPath)),
        void 0 === boundaryNode)
      )
        (request = {}),
          (boundaryNode = [keyPath[1], keyPath[2], [], request]),
          boundary.set(keyPath, boundaryNode),
          addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
      else if (((request = boundaryNode[3]), null === request))
        request = boundaryNode[3] = {};
      else if ("number" === typeof request)
        throw Error(formatProdErrorMessage(491));
      request[task.childIndex] = segment.id;
    }
  }
}
function untrackBoundary(request, boundary) {
  request = request.trackedPostpones;
  null !== request &&
    ((boundary = boundary.trackedContentKeyPath),
    null !== boundary &&
      ((boundary = request.workingMap.get(boundary)),
      void 0 !== boundary &&
        ((boundary.length = 4), (boundary[2] = []), (boundary[3] = null))));
}
function spawnNewSuspendedReplayTask(request, task, thenableState) {
  return createReplayTask(
    request,
    thenableState,
    task.replay,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack
  );
}
function spawnNewSuspendedRenderTask(request, task, thenableState) {
  var segment = task.blockedSegment,
    newSegment = createPendingSegment(
      request,
      segment.chunks.length,
      null,
      task.formatContext,
      segment.lastPushedText,
      !0
    );
  segment.children.push(newSegment);
  segment.lastPushedText = !1;
  return createRenderTask(
    request,
    thenableState,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    newSegment,
    task.blockedPreamble,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack
  );
}
function renderNode(request, task, node, childIndex) {
  var previousFormatContext = task.formatContext,
    previousContext = task.context,
    previousKeyPath = task.keyPath,
    previousTreeContext = task.treeContext,
    previousComponentStack = task.componentStack,
    segment = task.blockedSegment;
  if (null === segment) {
    segment = task.replay;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue) {
      if (
        (resetHooksState(),
        (node =
          thrownValue === SuspenseException
            ? getSuspendedThenable()
            : thrownValue),
        12 !== request.status && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          childIndex =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
          node.then(request, request);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          node =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          node = spawnNewSuspendedReplayTask(request, task, node);
          request.pingedTasks.push(node);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = segment;
          switchContext(previousContext);
          return;
        }
      }
    }
  } else {
    var childrenLength = segment.children.length,
      chunkLength = segment.chunks.length;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue$63) {
      if (
        (resetHooksState(),
        (segment.children.length = childrenLength),
        (segment.chunks.length = chunkLength),
        (node =
          thrownValue$63 === SuspenseException
            ? getSuspendedThenable()
            : thrownValue$63),
        12 !== request.status && "object" === typeof node && null !== node)
      ) {
        if ("function" === typeof node.then) {
          segment = node;
          node =
            thrownValue$63 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          request = spawnNewSuspendedRenderTask(request, task, node).ping;
          segment.then(request, request);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
        if ("Maximum call stack size exceeded" === node.message) {
          segment =
            thrownValue$63 === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          segment = spawnNewSuspendedRenderTask(request, task, segment);
          request.pingedTasks.push(segment);
          task.formatContext = previousFormatContext;
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          switchContext(previousContext);
          return;
        }
      }
    }
  }
  task.formatContext = previousFormatContext;
  task.context = previousContext;
  task.keyPath = previousKeyPath;
  task.treeContext = previousTreeContext;
  switchContext(previousContext);
  throw node;
}
function abortTaskSoft(task) {
  var boundary = task.blockedBoundary,
    segment = task.blockedSegment;
  null !== segment &&
    ((segment.status = 3), finishedTask(this, boundary, task.row, segment));
}
function abortRemainingReplayNodes(
  request$jscomp$0,
  boundary,
  nodes,
  slots,
  error,
  errorDigest$jscomp$0
) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (4 === node.length)
      abortRemainingReplayNodes(
        request$jscomp$0,
        boundary,
        node[2],
        node[3],
        error,
        errorDigest$jscomp$0
      );
    else {
      node = node[5];
      var request = request$jscomp$0,
        errorDigest = errorDigest$jscomp$0,
        resumedBoundary = createSuspenseBoundary(
          request,
          null,
          new Set(),
          null,
          null
        );
      resumedBoundary.parentFlushed = !0;
      resumedBoundary.rootSegmentID = node;
      resumedBoundary.status = 4;
      resumedBoundary.errorDigest = errorDigest;
      resumedBoundary.parentFlushed &&
        request.clientRenderedBoundaries.push(resumedBoundary);
    }
  }
  nodes.length = 0;
  if (null !== slots) {
    if (null === boundary) throw Error(formatProdErrorMessage(487));
    4 !== boundary.status &&
      ((boundary.status = 4),
      (boundary.errorDigest = errorDigest$jscomp$0),
      boundary.parentFlushed &&
        request$jscomp$0.clientRenderedBoundaries.push(boundary));
    if ("object" === typeof slots) for (var index in slots) delete slots[index];
  }
}
function abortTask(task, request, error) {
  var boundary = task.blockedBoundary,
    segment = task.blockedSegment;
  if (null !== segment) {
    if (6 === segment.status) return;
    segment.status = 3;
  }
  var errorInfo = getThrownInfo(task.componentStack);
  if (null === boundary) {
    if (13 !== request.status && 14 !== request.status) {
      boundary = task.replay;
      if (null === boundary) {
        null !== request.trackedPostpones && null !== segment
          ? ((boundary = request.trackedPostpones),
            logRecoverableError(request, error, errorInfo),
            trackPostpone(request, boundary, task, segment),
            finishedTask(request, null, task.row, segment))
          : (logRecoverableError(request, error, errorInfo),
            fatalError(request, error));
        return;
      }
      boundary.pendingTasks--;
      0 === boundary.pendingTasks &&
        0 < boundary.nodes.length &&
        ((segment = logRecoverableError(request, error, errorInfo)),
        abortRemainingReplayNodes(
          request,
          null,
          boundary.nodes,
          boundary.slots,
          error,
          segment
        ));
      request.pendingRootTasks--;
      0 === request.pendingRootTasks && completeShell(request);
    }
  } else {
    var trackedPostpones$64 = request.trackedPostpones;
    if (4 !== boundary.status) {
      if (null !== trackedPostpones$64 && null !== segment)
        return (
          logRecoverableError(request, error, errorInfo),
          trackPostpone(request, trackedPostpones$64, task, segment),
          boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
            return abortTask(fallbackTask, request, error);
          }),
          boundary.fallbackAbortableTasks.clear(),
          finishedTask(request, boundary, task.row, segment)
        );
      boundary.status = 4;
      segment = logRecoverableError(request, error, errorInfo);
      boundary.status = 4;
      boundary.errorDigest = segment;
      untrackBoundary(request, boundary);
      boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
    }
    boundary.pendingTasks--;
    segment = boundary.row;
    null !== segment &&
      0 === --segment.pendingTasks &&
      finishSuspenseListRow(request, segment);
    boundary.fallbackAbortableTasks.forEach(function (fallbackTask) {
      return abortTask(fallbackTask, request, error);
    });
    boundary.fallbackAbortableTasks.clear();
  }
  task = task.row;
  null !== task &&
    0 === --task.pendingTasks &&
    finishSuspenseListRow(request, task);
  request.allPendingTasks--;
  0 === request.allPendingTasks && completeAll(request);
}
function safelyEmitEarlyPreloads(request, shellComplete) {
  try {
    var renderState = request.renderState,
      onHeaders = renderState.onHeaders;
    if (onHeaders) {
      var headers = renderState.headers;
      if (headers) {
        renderState.headers = null;
        var linkHeader = headers.preconnects;
        headers.fontPreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.fontPreloads));
        headers.highImagePreloads &&
          (linkHeader && (linkHeader += ", "),
          (linkHeader += headers.highImagePreloads));
        if (!shellComplete) {
          var queueIter = renderState.styles.values(),
            queueStep = queueIter.next();
          b: for (
            ;
            0 < headers.remainingCapacity && !queueStep.done;
            queueStep = queueIter.next()
          )
            for (
              var sheetIter = queueStep.value.sheets.values(),
                sheetStep = sheetIter.next();
              0 < headers.remainingCapacity && !sheetStep.done;
              sheetStep = sheetIter.next()
            ) {
              var sheet = sheetStep.value,
                props = sheet.props,
                key = props.href,
                props$jscomp$0 = sheet.props,
                header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                  crossOrigin: props$jscomp$0.crossOrigin,
                  integrity: props$jscomp$0.integrity,
                  nonce: props$jscomp$0.nonce,
                  type: props$jscomp$0.type,
                  fetchPriority: props$jscomp$0.fetchPriority,
                  referrerPolicy: props$jscomp$0.referrerPolicy,
                  media: props$jscomp$0.media
                });
              if (0 <= (headers.remainingCapacity -= header.length + 2))
                (renderState.resets.style[key] = PRELOAD_NO_CREDS),
                  linkHeader && (linkHeader += ", "),
                  (linkHeader += header),
                  (renderState.resets.style[key] =
                    "string" === typeof props.crossOrigin ||
                    "string" === typeof props.integrity
                      ? [props.crossOrigin, props.integrity]
                      : PRELOAD_NO_CREDS);
              else break b;
            }
        }
        linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
      }
    }
  } catch (error) {
    logRecoverableError(request, error, {});
  }
}
function completeShell(request) {
  null === request.trackedPostpones && safelyEmitEarlyPreloads(request, !0);
  null === request.trackedPostpones && preparePreamble(request);
  request.onShellError = noop;
  request = request.onShellReady;
  request();
}
function completeAll(request) {
  safelyEmitEarlyPreloads(
    request,
    null === request.trackedPostpones
      ? !0
      : null === request.completedRootSegment ||
          5 !== request.completedRootSegment.status
  );
  preparePreamble(request);
  request = request.onAllReady;
  request();
}
function queueCompletedSegment(boundary, segment) {
  if (
    0 === segment.chunks.length &&
    1 === segment.children.length &&
    null === segment.children[0].boundary &&
    -1 === segment.children[0].id
  ) {
    var childSegment = segment.children[0];
    childSegment.id = segment.id;
    childSegment.parentFlushed = !0;
    (1 !== childSegment.status &&
      3 !== childSegment.status &&
      4 !== childSegment.status) ||
      queueCompletedSegment(boundary, childSegment);
  } else boundary.completedSegments.push(segment);
}
function finishedSegment(request, boundary, segment) {
  if (null !== byteLengthOfChunk) {
    segment = segment.chunks;
    for (var segmentByteSize = 0, i = 0; i < segment.length; i++)
      segmentByteSize += segment[i].byteLength;
    null === boundary
      ? (request.byteSize += segmentByteSize)
      : (boundary.byteSize += segmentByteSize);
  }
}
function finishedTask(request, boundary, row, segment) {
  null !== row &&
    (0 === --row.pendingTasks
      ? finishSuspenseListRow(request, row)
      : row.together && tryToResolveTogetherRow(request, row));
  request.allPendingTasks--;
  if (null === boundary) {
    if (null !== segment && segment.parentFlushed) {
      if (null !== request.completedRootSegment)
        throw Error(formatProdErrorMessage(389));
      request.completedRootSegment = segment;
    }
    request.pendingRootTasks--;
    0 === request.pendingRootTasks && completeShell(request);
  } else if ((boundary.pendingTasks--, 4 !== boundary.status))
    if (0 === boundary.pendingTasks)
      if (
        (0 === boundary.status && (boundary.status = 1),
        null !== segment &&
          segment.parentFlushed &&
          (1 === segment.status || 3 === segment.status) &&
          queueCompletedSegment(boundary, segment),
        boundary.parentFlushed && request.completedBoundaries.push(boundary),
        1 === boundary.status)
      )
        (row = boundary.row),
          null !== row &&
            hoistHoistables(row.hoistables, boundary.contentState),
          isEligibleForOutlining(request, boundary) ||
            (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request),
            boundary.fallbackAbortableTasks.clear(),
            null !== row &&
              0 === --row.pendingTasks &&
              finishSuspenseListRow(request, row)),
          0 === request.pendingRootTasks &&
            null === request.trackedPostpones &&
            null !== boundary.contentPreamble &&
            preparePreamble(request);
      else {
        if (
          5 === boundary.status &&
          ((boundary = boundary.row), null !== boundary)
        ) {
          if (null !== request.trackedPostpones) {
            row = request.trackedPostpones;
            var postponedRow = boundary.next;
            if (
              null !== postponedRow &&
              ((segment = postponedRow.boundaries), null !== segment)
            )
              for (
                postponedRow.boundaries = null, postponedRow = 0;
                postponedRow < segment.length;
                postponedRow++
              ) {
                var postponedBoundary = segment[postponedRow];
                trackPostponedBoundary(request, row, postponedBoundary);
                finishedTask(request, postponedBoundary, null, null);
              }
          }
          0 === --boundary.pendingTasks &&
            finishSuspenseListRow(request, boundary);
        }
      }
    else
      null === segment ||
        !segment.parentFlushed ||
        (1 !== segment.status && 3 !== segment.status) ||
        (queueCompletedSegment(boundary, segment),
        1 === boundary.completedSegments.length &&
          boundary.parentFlushed &&
          request.partialBoundaries.push(boundary)),
        (boundary = boundary.row),
        null !== boundary &&
          boundary.together &&
          tryToResolveTogetherRow(request, boundary);
  0 === request.allPendingTasks && completeAll(request);
}
function performWork(request$jscomp$2) {
  if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
    var prevContext = currentActiveSnapshot,
      prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = HooksDispatcher;
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    var prevRequest = currentRequest;
    currentRequest = request$jscomp$2;
    var prevResumableState = currentResumableState;
    currentResumableState = request$jscomp$2.resumableState;
    try {
      var pingedTasks = request$jscomp$2.pingedTasks,
        i;
      for (i = 0; i < pingedTasks.length; i++) {
        var task = pingedTasks[i],
          request = request$jscomp$2,
          segment = task.blockedSegment;
        if (null === segment) {
          var request$jscomp$0 = request;
          if (0 !== task.replay.pendingTasks) {
            switchContext(task.context);
            try {
              "number" === typeof task.replay.slots
                ? resumeNode(
                    request$jscomp$0,
                    task,
                    task.replay.slots,
                    task.node,
                    task.childIndex
                  )
                : retryNode(request$jscomp$0, task);
              if (
                1 === task.replay.pendingTasks &&
                0 < task.replay.nodes.length
              )
                throw Error(formatProdErrorMessage(488));
              task.replay.pendingTasks--;
              task.abortSet.delete(task);
              finishedTask(
                request$jscomp$0,
                task.blockedBoundary,
                task.row,
                null
              );
            } catch (thrownValue) {
              resetHooksState();
              var x =
                thrownValue === SuspenseException
                  ? getSuspendedThenable()
                  : thrownValue;
              if (
                "object" === typeof x &&
                null !== x &&
                "function" === typeof x.then
              ) {
                var ping = task.ping;
                x.then(ping, ping);
                task.thenableState =
                  thrownValue === SuspenseException
                    ? getThenableStateAfterSuspending()
                    : null;
              } else {
                task.replay.pendingTasks--;
                task.abortSet.delete(task);
                var errorInfo = getThrownInfo(task.componentStack);
                request = void 0;
                var request$jscomp$1 = request$jscomp$0,
                  boundary = task.blockedBoundary,
                  error$jscomp$0 =
                    12 === request$jscomp$0.status
                      ? request$jscomp$0.fatalError
                      : x,
                  replayNodes = task.replay.nodes,
                  resumeSlots = task.replay.slots;
                request = logRecoverableError(
                  request$jscomp$1,
                  error$jscomp$0,
                  errorInfo
                );
                abortRemainingReplayNodes(
                  request$jscomp$1,
                  boundary,
                  replayNodes,
                  resumeSlots,
                  error$jscomp$0,
                  request
                );
                request$jscomp$0.pendingRootTasks--;
                0 === request$jscomp$0.pendingRootTasks &&
                  completeShell(request$jscomp$0);
                request$jscomp$0.allPendingTasks--;
                0 === request$jscomp$0.allPendingTasks &&
                  completeAll(request$jscomp$0);
              }
            } finally {
            }
          }
        } else if (
          ((request$jscomp$0 = void 0),
          (request$jscomp$1 = segment),
          0 === request$jscomp$1.status)
        ) {
          request$jscomp$1.status = 6;
          switchContext(task.context);
          var childrenLength = request$jscomp$1.children.length,
            chunkLength = request$jscomp$1.chunks.length;
          try {
            retryNode(request, task),
              request$jscomp$1.lastPushedText &&
                request$jscomp$1.textEmbedded &&
                request$jscomp$1.chunks.push(textSeparator),
              task.abortSet.delete(task),
              (request$jscomp$1.status = 1),
              finishedSegment(request, task.blockedBoundary, request$jscomp$1),
              finishedTask(
                request,
                task.blockedBoundary,
                task.row,
                request$jscomp$1
              );
          } catch (thrownValue) {
            resetHooksState();
            request$jscomp$1.children.length = childrenLength;
            request$jscomp$1.chunks.length = chunkLength;
            var x$jscomp$0 =
              thrownValue === SuspenseException
                ? getSuspendedThenable()
                : 12 === request.status
                  ? request.fatalError
                  : thrownValue;
            if (12 === request.status && null !== request.trackedPostpones) {
              var trackedPostpones = request.trackedPostpones,
                thrownInfo = getThrownInfo(task.componentStack);
              task.abortSet.delete(task);
              logRecoverableError(request, x$jscomp$0, thrownInfo);
              trackPostpone(request, trackedPostpones, task, request$jscomp$1);
              finishedTask(
                request,
                task.blockedBoundary,
                task.row,
                request$jscomp$1
              );
            } else if (
              "object" === typeof x$jscomp$0 &&
              null !== x$jscomp$0 &&
              "function" === typeof x$jscomp$0.then
            ) {
              request$jscomp$1.status = 0;
              task.thenableState =
                thrownValue === SuspenseException
                  ? getThenableStateAfterSuspending()
                  : null;
              var ping$jscomp$0 = task.ping;
              x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
            } else {
              var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
              task.abortSet.delete(task);
              request$jscomp$1.status = 4;
              var boundary$jscomp$0 = task.blockedBoundary,
                row = task.row;
              null !== row &&
                0 === --row.pendingTasks &&
                finishSuspenseListRow(request, row);
              request.allPendingTasks--;
              request$jscomp$0 = logRecoverableError(
                request,
                x$jscomp$0,
                errorInfo$jscomp$0
              );
              if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
              else if (
                (boundary$jscomp$0.pendingTasks--,
                4 !== boundary$jscomp$0.status)
              ) {
                boundary$jscomp$0.status = 4;
                boundary$jscomp$0.errorDigest = request$jscomp$0;
                untrackBoundary(request, boundary$jscomp$0);
                var boundaryRow = boundary$jscomp$0.row;
                null !== boundaryRow &&
                  0 === --boundaryRow.pendingTasks &&
                  finishSuspenseListRow(request, boundaryRow);
                boundary$jscomp$0.parentFlushed &&
                  request.clientRenderedBoundaries.push(boundary$jscomp$0);
                0 === request.pendingRootTasks &&
                  null === request.trackedPostpones &&
                  null !== boundary$jscomp$0.contentPreamble &&
                  preparePreamble(request);
              }
              0 === request.allPendingTasks && completeAll(request);
            }
          } finally {
          }
        }
      }
      pingedTasks.splice(0, i);
      null !== request$jscomp$2.destination &&
        flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
    } catch (error) {
      logRecoverableError(request$jscomp$2, error, {}),
        fatalError(request$jscomp$2, error);
    } finally {
      (currentResumableState = prevResumableState),
        (ReactSharedInternals.H = prevDispatcher),
        (ReactSharedInternals.A = prevAsyncDispatcher),
        prevDispatcher === HooksDispatcher && switchContext(prevContext),
        (currentRequest = prevRequest);
    }
  }
}
function preparePreambleFromSubtree(
  request,
  segment,
  collectedPreambleSegments
) {
  segment.preambleChildren.length &&
    collectedPreambleSegments.push(segment.preambleChildren);
  for (var pendingPreambles = !1, i = 0; i < segment.children.length; i++)
    pendingPreambles =
      preparePreambleFromSegment(
        request,
        segment.children[i],
        collectedPreambleSegments
      ) || pendingPreambles;
  return pendingPreambles;
}
function preparePreambleFromSegment(
  request,
  segment,
  collectedPreambleSegments
) {
  var boundary = segment.boundary;
  if (null === boundary)
    return preparePreambleFromSubtree(
      request,
      segment,
      collectedPreambleSegments
    );
  var preamble = boundary.contentPreamble,
    fallbackPreamble = boundary.fallbackPreamble;
  if (null === preamble || null === fallbackPreamble) return !1;
  switch (boundary.status) {
    case 1:
      hoistPreambleState(request.renderState, preamble);
      request.byteSize += boundary.byteSize;
      segment = boundary.completedSegments[0];
      if (!segment) throw Error(formatProdErrorMessage(391));
      return preparePreambleFromSubtree(
        request,
        segment,
        collectedPreambleSegments
      );
    case 5:
      if (null !== request.trackedPostpones) return !0;
    case 4:
      if (1 === segment.status)
        return (
          hoistPreambleState(request.renderState, fallbackPreamble),
          preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          )
        );
    default:
      return !0;
  }
}
function preparePreamble(request) {
  if (
    request.completedRootSegment &&
    null === request.completedPreambleSegments
  ) {
    var collectedPreambleSegments = [],
      originalRequestByteSize = request.byteSize,
      hasPendingPreambles = preparePreambleFromSegment(
        request,
        request.completedRootSegment,
        collectedPreambleSegments
      ),
      preamble = request.renderState.preamble;
    !1 === hasPendingPreambles || (preamble.headChunks && preamble.bodyChunks)
      ? (request.completedPreambleSegments = collectedPreambleSegments)
      : (request.byteSize = originalRequestByteSize);
  }
}
function flushSubtree(request, destination, segment, hoistableState) {
  segment.parentFlushed = !0;
  switch (segment.status) {
    case 0:
      segment.id = request.nextSegmentId++;
    case 5:
      return (
        (hoistableState = segment.id),
        (segment.lastPushedText = !1),
        (segment.textEmbedded = !1),
        (request = request.renderState),
        writeChunk(destination, placeholder1),
        writeChunk(destination, request.placeholderPrefix),
        (request = stringToChunk(hoistableState.toString(16))),
        writeChunk(destination, request),
        writeChunkAndReturn(destination, placeholder2)
      );
    case 1:
      segment.status = 2;
      var r = !0,
        chunks = segment.chunks,
        chunkIdx = 0;
      segment = segment.children;
      for (var childIdx = 0; childIdx < segment.length; childIdx++) {
        for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++)
          writeChunk(destination, chunks[chunkIdx]);
        r = flushSegment(request, destination, r, hoistableState);
      }
      for (; chunkIdx < chunks.length - 1; chunkIdx++)
        writeChunk(destination, chunks[chunkIdx]);
      chunkIdx < chunks.length &&
        (r = writeChunkAndReturn(destination, chunks[chunkIdx]));
      return r;
    case 3:
      return !0;
    default:
      throw Error(formatProdErrorMessage(390));
  }
}
var flushedByteSize = 0;
function flushSegment(request, destination, segment, hoistableState) {
  var boundary = segment.boundary;
  if (null === boundary)
    return flushSubtree(request, destination, segment, hoistableState);
  boundary.parentFlushed = !0;
  if (4 === boundary.status) {
    var row = boundary.row;
    null !== row &&
      0 === --row.pendingTasks &&
      finishSuspenseListRow(request, row);
    boundary = boundary.errorDigest;
    writeChunkAndReturn(destination, startClientRenderedSuspenseBoundary);
    writeChunk(destination, clientRenderedSuspenseBoundaryError1);
    boundary &&
      (writeChunk(destination, clientRenderedSuspenseBoundaryError1A),
      writeChunk(destination, stringToChunk(escapeTextForBrowser(boundary))),
      writeChunk(
        destination,
        clientRenderedSuspenseBoundaryErrorAttrInterstitial
      ));
    writeChunkAndReturn(destination, clientRenderedSuspenseBoundaryError2);
    flushSubtree(request, destination, segment, hoistableState);
  } else if (1 !== boundary.status)
    0 === boundary.status && (boundary.rootSegmentID = request.nextSegmentId++),
      0 < boundary.completedSegments.length &&
        request.partialBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      hoistableState && hoistHoistables(hoistableState, boundary.fallbackState),
      flushSubtree(request, destination, segment, hoistableState);
  else if (
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    (flushedByteSize + boundary.byteSize > request.progressiveChunkSize ||
      hasSuspenseyContent(boundary.contentState))
  )
    (boundary.rootSegmentID = request.nextSegmentId++),
      request.completedBoundaries.push(boundary),
      writeStartPendingSuspenseBoundary(
        destination,
        request.renderState,
        boundary.rootSegmentID
      ),
      flushSubtree(request, destination, segment, hoistableState);
  else {
    flushedByteSize += boundary.byteSize;
    hoistableState && hoistHoistables(hoistableState, boundary.contentState);
    segment = boundary.row;
    null !== segment &&
      isEligibleForOutlining(request, boundary) &&
      0 === --segment.pendingTasks &&
      finishSuspenseListRow(request, segment);
    writeChunkAndReturn(destination, startCompletedSuspenseBoundary);
    segment = boundary.completedSegments;
    if (1 !== segment.length) throw Error(formatProdErrorMessage(391));
    flushSegment(request, destination, segment[0], hoistableState);
  }
  return writeChunkAndReturn(destination, endSuspenseBoundary);
}
function flushSegmentContainer(request, destination, segment, hoistableState) {
  writeStartSegment(
    destination,
    request.renderState,
    segment.parentFormatContext,
    segment.id
  );
  flushSegment(request, destination, segment, hoistableState);
  return writeEndSegment(destination, segment.parentFormatContext);
}
function flushCompletedBoundary(request, destination, boundary) {
  flushedByteSize = boundary.byteSize;
  for (
    var completedSegments = boundary.completedSegments, i = 0;
    i < completedSegments.length;
    i++
  )
    flushPartiallyCompletedSegment(
      request,
      destination,
      boundary,
      completedSegments[i]
    );
  completedSegments.length = 0;
  completedSegments = boundary.row;
  null !== completedSegments &&
    isEligibleForOutlining(request, boundary) &&
    0 === --completedSegments.pendingTasks &&
    finishSuspenseListRow(request, completedSegments);
  writeHoistablesForBoundary(
    destination,
    boundary.contentState,
    request.renderState
  );
  completedSegments = request.resumableState;
  request = request.renderState;
  i = boundary.rootSegmentID;
  boundary = boundary.contentState;
  var requiresStyleInsertion = request.stylesToHoist;
  request.stylesToHoist = !1;
  writeChunk(destination, request.startInlineScript);
  writeChunk(destination, endOfStartTag);
  requiresStyleInsertion
    ? (0 === (completedSegments.instructions & 4) &&
        ((completedSegments.instructions |= 4),
        writeChunk(destination, clientRenderScriptFunctionOnly)),
      0 === (completedSegments.instructions & 2) &&
        ((completedSegments.instructions |= 2),
        writeChunk(destination, completeBoundaryScriptFunctionOnly)),
      0 === (completedSegments.instructions & 8)
        ? ((completedSegments.instructions |= 8),
          writeChunk(destination, completeBoundaryWithStylesScript1FullPartial))
        : writeChunk(destination, completeBoundaryWithStylesScript1Partial))
    : (0 === (completedSegments.instructions & 2) &&
        ((completedSegments.instructions |= 2),
        writeChunk(destination, completeBoundaryScriptFunctionOnly)),
      writeChunk(destination, completeBoundaryScript1Partial));
  completedSegments = stringToChunk(i.toString(16));
  writeChunk(destination, request.boundaryPrefix);
  writeChunk(destination, completedSegments);
  writeChunk(destination, completeBoundaryScript2);
  writeChunk(destination, request.segmentPrefix);
  writeChunk(destination, completedSegments);
  requiresStyleInsertion
    ? (writeChunk(destination, completeBoundaryScript3a),
      writeStyleResourceDependenciesInJS(destination, boundary))
    : writeChunk(destination, completeBoundaryScript3b);
  boundary = writeChunkAndReturn(destination, completeBoundaryScriptEnd);
  return writeBootstrap(destination, request) && boundary;
}
function flushPartiallyCompletedSegment(
  request,
  destination,
  boundary,
  segment
) {
  if (2 === segment.status) return !0;
  var hoistableState = boundary.contentState,
    segmentID = segment.id;
  if (-1 === segmentID) {
    if (-1 === (segment.id = boundary.rootSegmentID))
      throw Error(formatProdErrorMessage(392));
    return flushSegmentContainer(request, destination, segment, hoistableState);
  }
  if (segmentID === boundary.rootSegmentID)
    return flushSegmentContainer(request, destination, segment, hoistableState);
  flushSegmentContainer(request, destination, segment, hoistableState);
  boundary = request.resumableState;
  request = request.renderState;
  writeChunk(destination, request.startInlineScript);
  writeChunk(destination, endOfStartTag);
  0 === (boundary.instructions & 1)
    ? ((boundary.instructions |= 1),
      writeChunk(destination, completeSegmentScript1Full))
    : writeChunk(destination, completeSegmentScript1Partial);
  writeChunk(destination, request.segmentPrefix);
  segmentID = stringToChunk(segmentID.toString(16));
  writeChunk(destination, segmentID);
  writeChunk(destination, completeSegmentScript2);
  writeChunk(destination, request.placeholderPrefix);
  writeChunk(destination, segmentID);
  destination = writeChunkAndReturn(destination, completeSegmentScriptEnd);
  return destination;
}
var flushingPartialBoundaries = !1;
function flushCompletedQueues(request, destination) {
  currentView = new Uint8Array(2048);
  writtenBytes = 0;
  try {
    if (!(0 < request.pendingRootTasks)) {
      var i,
        completedRootSegment = request.completedRootSegment;
      if (null !== completedRootSegment) {
        if (5 === completedRootSegment.status) return;
        var completedPreambleSegments = request.completedPreambleSegments;
        if (null === completedPreambleSegments) return;
        flushedByteSize = request.byteSize;
        var resumableState = request.resumableState,
          renderState = request.renderState,
          preamble = renderState.preamble,
          htmlChunks = preamble.htmlChunks,
          headChunks = preamble.headChunks,
          i$jscomp$0;
        if (htmlChunks) {
          for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
            writeChunk(destination, htmlChunks[i$jscomp$0]);
          if (headChunks)
            for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
              writeChunk(destination, headChunks[i$jscomp$0]);
          else
            writeChunk(destination, startChunkForTag("head")),
              writeChunk(destination, endOfStartTag);
        } else if (headChunks)
          for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
            writeChunk(destination, headChunks[i$jscomp$0]);
        var charsetChunks = renderState.charsetChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
          writeChunk(destination, charsetChunks[i$jscomp$0]);
        charsetChunks.length = 0;
        renderState.preconnects.forEach(flushResource, destination);
        renderState.preconnects.clear();
        var viewportChunks = renderState.viewportChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
          writeChunk(destination, viewportChunks[i$jscomp$0]);
        viewportChunks.length = 0;
        renderState.fontPreloads.forEach(flushResource, destination);
        renderState.fontPreloads.clear();
        renderState.highImagePreloads.forEach(flushResource, destination);
        renderState.highImagePreloads.clear();
        currentlyFlushingRenderState = renderState;
        renderState.styles.forEach(flushStylesInPreamble, destination);
        currentlyFlushingRenderState = null;
        var importMapChunks = renderState.importMapChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
          writeChunk(destination, importMapChunks[i$jscomp$0]);
        importMapChunks.length = 0;
        renderState.bootstrapScripts.forEach(flushResource, destination);
        renderState.scripts.forEach(flushResource, destination);
        renderState.scripts.clear();
        renderState.bulkPreloads.forEach(flushResource, destination);
        renderState.bulkPreloads.clear();
        htmlChunks || headChunks || (resumableState.instructions |= 32);
        var hoistableChunks = renderState.hoistableChunks;
        for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
          writeChunk(destination, hoistableChunks[i$jscomp$0]);
        for (
          resumableState = hoistableChunks.length = 0;
          resumableState < completedPreambleSegments.length;
          resumableState++
        ) {
          var segments = completedPreambleSegments[resumableState];
          for (renderState = 0; renderState < segments.length; renderState++)
            flushSegment(request, destination, segments[renderState], null);
        }
        var preamble$jscomp$0 = request.renderState.preamble,
          headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
        (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) &&
          writeChunk(destination, endChunkForTag("head"));
        var bodyChunks = preamble$jscomp$0.bodyChunks;
        if (bodyChunks)
          for (
            completedPreambleSegments = 0;
            completedPreambleSegments < bodyChunks.length;
            completedPreambleSegments++
          )
            writeChunk(destination, bodyChunks[completedPreambleSegments]);
        flushSegment(request, destination, completedRootSegment, null);
        request.completedRootSegment = null;
        var renderState$jscomp$0 = request.renderState;
        if (
          0 !== request.allPendingTasks ||
          0 !== request.clientRenderedBoundaries.length ||
          0 !== request.completedBoundaries.length ||
          (null !== request.trackedPostpones &&
            (0 !== request.trackedPostpones.rootNodes.length ||
              null !== request.trackedPostpones.rootSlots))
        ) {
          var resumableState$jscomp$0 = request.resumableState;
          if (0 === (resumableState$jscomp$0.instructions & 64)) {
            resumableState$jscomp$0.instructions |= 64;
            writeChunk(destination, renderState$jscomp$0.startInlineScript);
            if (0 === (resumableState$jscomp$0.instructions & 32)) {
              resumableState$jscomp$0.instructions |= 32;
              var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
              writeChunk(destination, completedShellIdAttributeStart);
              writeChunk(
                destination,
                stringToChunk(escapeTextForBrowser(shellId))
              );
              writeChunk(destination, attributeEnd);
            }
            writeChunk(destination, endOfStartTag);
            writeChunk(destination, shellTimeRuntimeScript);
            writeChunkAndReturn(destination, endInlineScript);
          }
        }
        writeBootstrap(destination, renderState$jscomp$0);
      }
      var renderState$jscomp$1 = request.renderState;
      completedRootSegment = 0;
      var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < viewportChunks$jscomp$0.length;
        completedRootSegment++
      )
        writeChunk(destination, viewportChunks$jscomp$0[completedRootSegment]);
      viewportChunks$jscomp$0.length = 0;
      renderState$jscomp$1.preconnects.forEach(flushResource, destination);
      renderState$jscomp$1.preconnects.clear();
      renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.fontPreloads.clear();
      renderState$jscomp$1.highImagePreloads.forEach(
        flushResource,
        destination
      );
      renderState$jscomp$1.highImagePreloads.clear();
      renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
      renderState$jscomp$1.scripts.forEach(flushResource, destination);
      renderState$jscomp$1.scripts.clear();
      renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
      renderState$jscomp$1.bulkPreloads.clear();
      var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
      for (
        completedRootSegment = 0;
        completedRootSegment < hoistableChunks$jscomp$0.length;
        completedRootSegment++
      )
        writeChunk(destination, hoistableChunks$jscomp$0[completedRootSegment]);
      hoistableChunks$jscomp$0.length = 0;
      var clientRenderedBoundaries = request.clientRenderedBoundaries;
      for (i = 0; i < clientRenderedBoundaries.length; i++) {
        var boundary = clientRenderedBoundaries[i];
        renderState$jscomp$1 = destination;
        var resumableState$jscomp$1 = request.resumableState,
          renderState$jscomp$2 = request.renderState,
          id = boundary.rootSegmentID,
          errorDigest = boundary.errorDigest;
        writeChunk(
          renderState$jscomp$1,
          renderState$jscomp$2.startInlineScript
        );
        writeChunk(renderState$jscomp$1, endOfStartTag);
        0 === (resumableState$jscomp$1.instructions & 4)
          ? ((resumableState$jscomp$1.instructions |= 4),
            writeChunk(renderState$jscomp$1, clientRenderScript1Full))
          : writeChunk(renderState$jscomp$1, clientRenderScript1Partial);
        writeChunk(renderState$jscomp$1, renderState$jscomp$2.boundaryPrefix);
        writeChunk(renderState$jscomp$1, stringToChunk(id.toString(16)));
        writeChunk(renderState$jscomp$1, clientRenderScript1A);
        errorDigest &&
          (writeChunk(
            renderState$jscomp$1,
            clientRenderErrorScriptArgInterstitial
          ),
          writeChunk(
            renderState$jscomp$1,
            stringToChunk(
              escapeJSStringsForInstructionScripts(errorDigest || "")
            )
          ));
        var JSCompiler_inline_result = writeChunkAndReturn(
          renderState$jscomp$1,
          clientRenderScriptEnd
        );
        if (!JSCompiler_inline_result) {
          request.destination = null;
          i++;
          clientRenderedBoundaries.splice(0, i);
          return;
        }
      }
      clientRenderedBoundaries.splice(0, i);
      var completedBoundaries = request.completedBoundaries;
      for (i = 0; i < completedBoundaries.length; i++)
        if (
          !flushCompletedBoundary(request, destination, completedBoundaries[i])
        ) {
          request.destination = null;
          i++;
          completedBoundaries.splice(0, i);
          return;
        }
      completedBoundaries.splice(0, i);
      completeWriting(destination);
      currentView = new Uint8Array(2048);
      writtenBytes = 0;
      flushingPartialBoundaries = !0;
      var partialBoundaries = request.partialBoundaries;
      for (i = 0; i < partialBoundaries.length; i++) {
        var boundary$70 = partialBoundaries[i];
        a: {
          clientRenderedBoundaries = request;
          boundary = destination;
          flushedByteSize = boundary$70.byteSize;
          var completedSegments = boundary$70.completedSegments;
          for (
            JSCompiler_inline_result = 0;
            JSCompiler_inline_result < completedSegments.length;
            JSCompiler_inline_result++
          )
            if (
              !flushPartiallyCompletedSegment(
                clientRenderedBoundaries,
                boundary,
                boundary$70,
                completedSegments[JSCompiler_inline_result]
              )
            ) {
              JSCompiler_inline_result++;
              completedSegments.splice(0, JSCompiler_inline_result);
              var JSCompiler_inline_result$jscomp$0 = !1;
              break a;
            }
          completedSegments.splice(0, JSCompiler_inline_result);
          var row = boundary$70.row;
          null !== row &&
            row.together &&
            1 === boundary$70.pendingTasks &&
            (1 === row.pendingTasks
              ? unblockSuspenseListRow(
                  clientRenderedBoundaries,
                  row,
                  row.hoistables
                )
              : row.pendingTasks--);
          JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
            boundary,
            boundary$70.contentState,
            clientRenderedBoundaries.renderState
          );
        }
        if (!JSCompiler_inline_result$jscomp$0) {
          request.destination = null;
          i++;
          partialBoundaries.splice(0, i);
          return;
        }
      }
      partialBoundaries.splice(0, i);
      flushingPartialBoundaries = !1;
      var largeBoundaries = request.completedBoundaries;
      for (i = 0; i < largeBoundaries.length; i++)
        if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
          request.destination = null;
          i++;
          largeBoundaries.splice(0, i);
          return;
        }
      largeBoundaries.splice(0, i);
    }
  } finally {
    (flushingPartialBoundaries = !1),
      0 === request.allPendingTasks &&
      0 === request.clientRenderedBoundaries.length &&
      0 === request.completedBoundaries.length
        ? ((request.flushScheduled = !1),
          (i = request.resumableState),
          i.hasBody && writeChunk(destination, endChunkForTag("body")),
          i.hasHtml && writeChunk(destination, endChunkForTag("html")),
          completeWriting(destination),
          (request.status = 14),
          destination.close(),
          (request.destination = null))
        : completeWriting(destination);
  }
}
function startWork(request) {
  request.flushScheduled = null !== request.destination;
  scheduleMicrotask(function () {
    return performWork(request);
  });
  scheduleWork(function () {
    10 === request.status && (request.status = 11);
    null === request.trackedPostpones &&
      safelyEmitEarlyPreloads(request, 0 === request.pendingRootTasks);
  });
}
function enqueueFlush(request) {
  !1 === request.flushScheduled &&
    0 === request.pingedTasks.length &&
    null !== request.destination &&
    ((request.flushScheduled = !0),
    scheduleWork(function () {
      var destination = request.destination;
      destination
        ? flushCompletedQueues(request, destination)
        : (request.flushScheduled = !1);
    }));
}
function startFlowing(request, destination) {
  if (13 === request.status)
    (request.status = 14), closeWithError(destination, request.fatalError);
  else if (14 !== request.status && null === request.destination) {
    request.destination = destination;
    try {
      flushCompletedQueues(request, destination);
    } catch (error) {
      logRecoverableError(request, error, {}), fatalError(request, error);
    }
  }
}
function abort(request, reason) {
  if (11 === request.status || 10 === request.status) request.status = 12;
  try {
    var abortableTasks = request.abortableTasks;
    if (0 < abortableTasks.size) {
      var error =
        void 0 === reason
          ? Error(formatProdErrorMessage(432))
          : "object" === typeof reason &&
              null !== reason &&
              "function" === typeof reason.then
            ? Error(formatProdErrorMessage(530))
            : reason;
      request.fatalError = error;
      abortableTasks.forEach(function (task) {
        return abortTask(task, request, error);
      });
      abortableTasks.clear();
    }
    null !== request.destination &&
      flushCompletedQueues(request, request.destination);
  } catch (error$72) {
    logRecoverableError(request, error$72, {}), fatalError(request, error$72);
  }
}
function addToReplayParent(node, parentKeyPath, trackedPostpones) {
  if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
  else {
    var workingMap = trackedPostpones.workingMap,
      parentNode = workingMap.get(parentKeyPath);
    void 0 === parentNode &&
      ((parentNode = [parentKeyPath[1], parentKeyPath[2], [], null]),
      workingMap.set(parentKeyPath, parentNode),
      addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
    parentNode[2].push(node);
  }
}
function getPostponedState(request) {
  var trackedPostpones = request.trackedPostpones;
  if (
    null === trackedPostpones ||
    (0 === trackedPostpones.rootNodes.length &&
      null === trackedPostpones.rootSlots)
  )
    return (request.trackedPostpones = null);
  if (
    null === request.completedRootSegment ||
    (5 !== request.completedRootSegment.status &&
      null !== request.completedPreambleSegments)
  ) {
    var nextSegmentId = request.nextSegmentId;
    var replaySlots = trackedPostpones.rootSlots;
    var resumableState = request.resumableState;
    resumableState.bootstrapScriptContent = void 0;
    resumableState.bootstrapScripts = void 0;
    resumableState.bootstrapModules = void 0;
  } else {
    nextSegmentId = 0;
    replaySlots = -1;
    resumableState = request.resumableState;
    var renderState = request.renderState;
    resumableState.nextFormID = 0;
    resumableState.hasBody = !1;
    resumableState.hasHtml = !1;
    resumableState.unknownResources = { font: renderState.resets.font };
    resumableState.dnsResources = renderState.resets.dns;
    resumableState.connectResources = renderState.resets.connect;
    resumableState.imageResources = renderState.resets.image;
    resumableState.styleResources = renderState.resets.style;
    resumableState.scriptResources = {};
    resumableState.moduleUnknownResources = {};
    resumableState.moduleScriptResources = {};
    resumableState.instructions = 0;
  }
  return {
    nextSegmentId: nextSegmentId,
    rootFormatContext: request.rootFormatContext,
    progressiveChunkSize: request.progressiveChunkSize,
    resumableState: request.resumableState,
    replayNodes: trackedPostpones.rootNodes,
    replaySlots: replaySlots
  };
}
function ensureCorrectIsomorphicReactVersion() {
  var isomorphicReactPackageVersion = React.version;
  if ("19.2.0" !== isomorphicReactPackageVersion)
    throw Error(
      formatProdErrorMessage(
        527,
        isomorphicReactPackageVersion,
        "19.2.0"
      )
    );
}
ensureCorrectIsomorphicReactVersion();
ensureCorrectIsomorphicReactVersion();
exports.prerender = function (children, options) {
  return new Promise(function (resolve, reject) {
    var onHeaders = options ? options.onHeaders : void 0,
      onHeadersImpl;
    onHeaders &&
      (onHeadersImpl = function (headersDescriptor) {
        onHeaders(new Headers(headersDescriptor));
      });
    var resources = createResumableState(
        options ? options.identifierPrefix : void 0,
        options ? options.unstable_externalRuntimeSrc : void 0,
        options ? options.bootstrapScriptContent : void 0,
        options ? options.bootstrapScripts : void 0,
        options ? options.bootstrapModules : void 0
      ),
      request = createPrerenderRequest(
        children,
        resources,
        createRenderState(
          resources,
          void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.importMap : void 0,
          onHeadersImpl,
          options ? options.maxHeadersLength : void 0
        ),
        createRootFormatContext(options ? options.namespaceURI : void 0),
        options ? options.progressiveChunkSize : void 0,
        options ? options.onError : void 0,
        function () {
          var stream = new ReadableStream(
            {
              type: "bytes",
              pull: function (controller) {
                startFlowing(request, controller);
              },
              cancel: function (reason) {
                request.destination = null;
                abort(request, reason);
              }
            },
            { highWaterMark: 0 }
          );
          stream = { postponed: getPostponedState(request), prelude: stream };
          resolve(stream);
        },
        void 0,
        void 0,
        reject,
        options ? options.onPostpone : void 0
      );
    if (options && options.signal) {
      var signal = options.signal;
      if (signal.aborted) abort(request, signal.reason);
      else {
        var listener = function () {
          abort(request, signal.reason);
          signal.removeEventListener("abort", listener);
        };
        signal.addEventListener("abort", listener);
      }
    }
    startWork(request);
  });
};
exports.renderToReadableStream = function (children, options) {
  return new Promise(function (resolve, reject) {
    var onFatalError,
      onAllReady,
      allReady = new Promise(function (res, rej) {
        onAllReady = res;
        onFatalError = rej;
      }),
      onHeaders = options ? options.onHeaders : void 0,
      onHeadersImpl;
    onHeaders &&
      (onHeadersImpl = function (headersDescriptor) {
        onHeaders(new Headers(headersDescriptor));
      });
    var resumableState = createResumableState(
        options ? options.identifierPrefix : void 0,
        options ? options.unstable_externalRuntimeSrc : void 0,
        options ? options.bootstrapScriptContent : void 0,
        options ? options.bootstrapScripts : void 0,
        options ? options.bootstrapModules : void 0
      ),
      request = createRequest(
        children,
        resumableState,
        createRenderState(
          resumableState,
          options ? options.nonce : void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.importMap : void 0,
          onHeadersImpl,
          options ? options.maxHeadersLength : void 0
        ),
        createRootFormatContext(options ? options.namespaceURI : void 0),
        options ? options.progressiveChunkSize : void 0,
        options ? options.onError : void 0,
        onAllReady,
        function () {
          var stream = new ReadableStream(
            {
              type: "bytes",
              pull: function (controller) {
                startFlowing(request, controller);
              },
              cancel: function (reason) {
                request.destination = null;
                abort(request, reason);
              }
            },
            { highWaterMark: 0 }
          );
          stream.allReady = allReady;
          resolve(stream);
        },
        function (error) {
          allReady.catch(function () {});
          reject(error);
        },
        onFatalError,
        options ? options.onPostpone : void 0,
        options ? options.formState : void 0
      );
    if (options && options.signal) {
      var signal = options.signal;
      if (signal.aborted) abort(request, signal.reason);
      else {
        var listener = function () {
          abort(request, signal.reason);
          signal.removeEventListener("abort", listener);
        };
        signal.addEventListener("abort", listener);
      }
    }
    startWork(request);
  });
};
exports.resume = function (children, postponedState, options) {
  return new Promise(function (resolve, reject) {
    var onFatalError,
      onAllReady,
      allReady = new Promise(function (res, rej) {
        onAllReady = res;
        onFatalError = rej;
      }),
      request = resumeRequest(
        children,
        postponedState,
        createRenderState(
          postponedState.resumableState,
          options ? options.nonce : void 0,
          void 0,
          void 0,
          void 0,
          void 0
        ),
        options ? options.onError : void 0,
        onAllReady,
        function () {
          var stream = new ReadableStream(
            {
              type: "bytes",
              pull: function (controller) {
                startFlowing(request, controller);
              },
              cancel: function (reason) {
                request.destination = null;
                abort(request, reason);
              }
            },
            { highWaterMark: 0 }
          );
          stream.allReady = allReady;
          resolve(stream);
        },
        function (error) {
          allReady.catch(function () {});
          reject(error);
        },
        onFatalError,
        options ? options.onPostpone : void 0
      );
    if (options && options.signal) {
      var signal = options.signal;
      if (signal.aborted) abort(request, signal.reason);
      else {
        var listener = function () {
          abort(request, signal.reason);
          signal.removeEventListener("abort", listener);
        };
        signal.addEventListener("abort", listener);
      }
    }
    startWork(request);
  });
};
exports.resumeAndPrerender = function (children, postponedState, options) {
  return new Promise(function (resolve, reject) {
    var request = resumeAndPrerenderRequest(
      children,
      postponedState,
      createRenderState(
        postponedState.resumableState,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0
      ),
      options ? options.onError : void 0,
      function () {
        var stream = new ReadableStream(
          {
            type: "bytes",
            pull: function (controller) {
              startFlowing(request, controller);
            },
            cancel: function (reason) {
              request.destination = null;
              abort(request, reason);
            }
          },
          { highWaterMark: 0 }
        );
        stream = { postponed: getPostponedState(request), prelude: stream };
        resolve(stream);
      },
      void 0,
      void 0,
      reject,
      options ? options.onPostpone : void 0
    );
    if (options && options.signal) {
      var signal = options.signal;
      if (signal.aborted) abort(request, signal.reason);
      else {
        var listener = function () {
          abort(request, signal.reason);
          signal.removeEventListener("abort", listener);
        };
        signal.addEventListener("abort", listener);
      }
    }
    startWork(request);
  });
};
exports.version = "19.2.0";


/***/ }),

/***/ 961:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
  ) {
    return;
  }
  if (false) // removed by dead control flow
{}
  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}

if (true) {
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = __webpack_require__(221);
} else // removed by dead control flow
{}


/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

;// ./node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
    return typeof o;
  } : function (o) {
    return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
  }, _typeof(o);
}

;// ./node_modules/@babel/runtime/helpers/esm/toPrimitive.js

function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}

;// ./node_modules/@babel/runtime/helpers/esm/toPropertyKey.js


function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}

;// ./node_modules/@babel/runtime/helpers/esm/defineProperty.js

function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
}

;// ./node_modules/@babel/runtime/helpers/esm/objectSpread2.js

function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function (r) {
      return Object.getOwnPropertyDescriptor(e, r).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
      _defineProperty(e, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return e;
}

;// ./src/features/canvas/combat/canvasExplosiveBlast.js

const itemName = item => (item === null || item === void 0 ? void 0 : item.name) || (item === null || item === void 0 ? void 0 : item.nombre) || 'Bomba explosiva';
const createExplosiveBlastPendingAttack = function (blast, targetId) {
  var _blast$targetAttackTe, _blast$targetNames, _blast$targetNames2;
  let index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  return blast.attackTemplate ? _objectSpread2(_objectSpread2({}, ((_blast$targetAttackTe = blast.targetAttackTemplates) === null || _blast$targetAttackTe === void 0 ? void 0 : _blast$targetAttackTe[targetId]) || blast.attackTemplate), {}, {
    id: "".concat(blast.id, "-target-").concat(encodeURIComponent(targetId)),
    targetId,
    targetName: ((_blast$targetNames = blast.targetNames) === null || _blast$targetNames === void 0 ? void 0 : _blast$targetNames[targetId]) || 'Objetivo',
    actionDieIds: [],
    status: 'awaiting-defense',
    blastId: blast.id,
    blastIndex: index,
    blastCount: blast.targetIds.length
  }) : {
    id: "".concat(blast.id, "-target-").concat(encodeURIComponent(targetId)),
    attackerId: blast.sourceTokenId,
    targetId,
    attackerName: blast.sourceName,
    targetName: ((_blast$targetNames2 = blast.targetNames) === null || _blast$targetNames2 === void 0 ? void 0 : _blast$targetNames2[targetId]) || 'Objetivo',
    weapon: blast.item,
    weaponName: itemName(blast.item),
    weaponDiceProfile: [{
      id: "".concat(blast.id, "-d8-1"),
      die: 'd8',
      sides: 8,
      source: 'Explosión'
    }, {
      id: "".concat(blast.id, "-d8-2"),
      die: 'd8',
      sides: 8,
      source: 'Explosión'
    }],
    weaponResults: [...blast.rolls],
    actionDice: blast.resource.kind === 'action-die' ? [blast.resource] : [],
    actionDieIds: [],
    attackThreatDice: blast.resource.kind === 'threat-die' ? [_objectSpread2(_objectSpread2({}, blast.resource), {}, {
      source: 'stored'
    })] : [],
    pressure: {
      actionPressure: blast.resource.kind === 'action-die' ? blast.resource.value : 0,
      threatPressure: blast.resource.kind === 'threat-die' ? blast.resource.value : 0,
      weaponPressure: blast.rolls[0] + blast.rolls[1],
      thrownPenalty: blast.distance,
      total: blast.pressure
    },
    range: {
      distance: blast.distance,
      suppressTraits: false
    },
    blastId: blast.id,
    blastIndex: index,
    blastCount: blast.targetIds.length,
    source: 'digital',
    status: 'awaiting-defense',
    createdAt: blast.createdAt
  };
};
const startCanvasExplosiveBlast = (combat, blast) => _objectSpread2(_objectSpread2({}, combat), {}, {
  explosiveBlast: blast.targetIds.length ? _objectSpread2(_objectSpread2({}, blast), {}, {
    nextTargetIndex: 1
  }) : null,
  pendingAttack: blast.targetIds.length ? createExplosiveBlastPendingAttack(blast, blast.targetIds[0], 0) : null,
  updatedAt: blast.createdAt
});
const continueQueuedFire = combat => {
  var _combat$queuedFireBur;
  if (combat.pendingAttack || combat.explosiveBlast || !((_combat$queuedFireBur = combat.queuedFireBursts) !== null && _combat$queuedFireBur !== void 0 && _combat$queuedFireBur.length)) return combat;
  const [next, ...remaining] = combat.queuedFireBursts;
  return startCanvasExplosiveBlast(_objectSpread2(_objectSpread2({}, combat), {}, {
    queuedFireBursts: remaining
  }), next);
};
const continueCanvasExplosiveBlast = function (combat, resolvedPending) {
  var _combat$arcaneChain;
  let items = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  const stored = combat === null || combat === void 0 ? void 0 : combat.explosiveBlast;
  const blast = stored !== null && stored !== void 0 && stored.attackTemplate && (resolvedPending === null || resolvedPending === void 0 ? void 0 : resolvedPending.blastIndex) === 0 ? _objectSpread2(_objectSpread2({}, stored), {}, {
    attackTemplate: _objectSpread2(_objectSpread2({}, stored.attackTemplate), {}, {
      pressure: resolvedPending.pressure,
      actionDice: resolvedPending.actionDice,
      adjustment: resolvedPending.adjustment || null
    })
  }) : stored;
  if (!blast) return continueQueuedFire(combat);
  if (blast.id !== (resolvedPending === null || resolvedPending === void 0 ? void 0 : resolvedPending.blastId) || combat.pendingAttack) return combat;
  const presentIds = new Set(items.map(item => item.id));
  let nextIndex = blast.nextTargetIndex;
  while (nextIndex < blast.targetIds.length && !presentIds.has(blast.targetIds[nextIndex])) nextIndex += 1;
  if (nextIndex >= blast.targetIds.length) return continueQueuedFire(_objectSpread2(_objectSpread2({}, combat), {}, {
    explosiveBlast: null
  }, ((_combat$arcaneChain = combat.arcaneChain) === null || _combat$arcaneChain === void 0 ? void 0 : _combat$arcaneChain.id) === blast.id ? {
    arcaneChain: _objectSpread2(_objectSpread2({}, combat.arcaneChain), {}, {
      phase: 'choose-target'
    })
  } : {}));
  return _objectSpread2(_objectSpread2({}, combat), {}, {
    explosiveBlast: _objectSpread2(_objectSpread2({}, blast), {}, {
      nextTargetIndex: nextIndex + 1
    }),
    pendingAttack: createExplosiveBlastPendingAttack(blast, blast.targetIds[nextIndex], nextIndex)
  });
};
;// ./src/features/tactical-shared/grid.js

// Frozen tactical grid infrastructure shared by the legacy Board and the Canvas host.
const DEFAULT_FINITE_COLUMNS = 12;
const DEFAULT_FINITE_ROWS = 8;
const TARGET_GRID_CELL_SIZE = 256;
const grid_DEFAULT_TOKEN_CELL_SCALE = 0.5;
const MIN_GRID_CELL_SIZE = 10;
const MAX_GRID_CELL_SIZE = 500;
const MIN_GRID_COUNT = 1;
const MAX_GRID_COUNT = 100;
const clampGridCount = function (rawValue) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_FINITE_COLUMNS;
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(MAX_GRID_COUNT, Math.max(MIN_GRID_COUNT, Math.round(numericValue)));
};
const clampCellSize = function (rawValue) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : TARGET_GRID_CELL_SIZE;
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(MAX_GRID_CELL_SIZE, Math.max(MIN_GRID_CELL_SIZE, Math.round(numericValue)));
};
const grid_DEFAULT_GRID_CONFIG = {
  cellWidth: TARGET_GRID_CELL_SIZE,
  cellHeight: TARGET_GRID_CELL_SIZE,
  color: '#334155',
  opacity: 0.3,
  lineWidth: 1,
  lineType: 'solid',
  isInfinite: true,
  columns: DEFAULT_FINITE_COLUMNS,
  rows: DEFAULT_FINITE_ROWS,
  backgroundImage: null,
  backgroundImageHash: null,
  imageWidth: null,
  imageHeight: null,
  snapToGrid: false,
  ambientDarkness: 0,
  fogOfWar: false,
  isCombatActive: false,
  lockFiniteMapSize: false
};
const normalizeGridConfig = function () {
  var _config$columns, _config$rows, _config$cellWidth, _config$cellHeight;
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread(_objectSpread({}, grid_DEFAULT_GRID_CONFIG), config || {}), {}, {
    columns: clampGridCount((_config$columns = config === null || config === void 0 ? void 0 : config.columns) !== null && _config$columns !== void 0 ? _config$columns : grid_DEFAULT_GRID_CONFIG.columns, grid_DEFAULT_GRID_CONFIG.columns),
    rows: clampGridCount((_config$rows = config === null || config === void 0 ? void 0 : config.rows) !== null && _config$rows !== void 0 ? _config$rows : grid_DEFAULT_GRID_CONFIG.rows, grid_DEFAULT_GRID_CONFIG.rows),
    cellWidth: clampCellSize((_config$cellWidth = config === null || config === void 0 ? void 0 : config.cellWidth) !== null && _config$cellWidth !== void 0 ? _config$cellWidth : grid_DEFAULT_GRID_CONFIG.cellWidth, grid_DEFAULT_GRID_CONFIG.cellWidth),
    cellHeight: clampCellSize((_config$cellHeight = config === null || config === void 0 ? void 0 : config.cellHeight) !== null && _config$cellHeight !== void 0 ? _config$cellHeight : grid_DEFAULT_GRID_CONFIG.cellHeight, grid_DEFAULT_GRID_CONFIG.cellHeight)
  });
};
const grid_roundGridValue = value => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return Math.round(numericValue * 100) / 100;
};
const getFiniteMapDimensions = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return {
    width: (Number(config.columns) || grid_DEFAULT_GRID_CONFIG.columns) * (Number(config.cellWidth) || grid_DEFAULT_GRID_CONFIG.cellWidth),
    height: (Number(config.rows) || grid_DEFAULT_GRID_CONFIG.rows) * (Number(config.cellHeight) || grid_DEFAULT_GRID_CONFIG.cellHeight)
  };
};
const getGridPixelDimensions = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return {
    width: (Number(config.columns) || grid_DEFAULT_GRID_CONFIG.columns) * (Number(config.cellWidth) || grid_DEFAULT_GRID_CONFIG.cellWidth),
    height: (Number(config.rows) || grid_DEFAULT_GRID_CONFIG.rows) * (Number(config.cellHeight) || grid_DEFAULT_GRID_CONFIG.cellHeight)
  };
};
const buildBackgroundGridPreset = (imageWidth, imageHeight, rawColumns, rawRows) => {
  const columns = clampGridCount(rawColumns);
  const rows = clampGridCount(rawRows, DEFAULT_FINITE_ROWS);
  const aspectRatio = imageWidth / imageHeight;
  const cellWidthFromImage = imageWidth / columns;
  const cellHeightFromImage = imageHeight / rows;
  const cellSize = clampCellSize((cellWidthFromImage + cellHeightFromImage) / 2);
  const frameWidth = columns * cellSize;
  const frameHeight = rows * cellSize;
  const aspectDelta = Math.abs(frameWidth / frameHeight - aspectRatio) / aspectRatio;
  const cellDelta = Math.abs(cellSize - TARGET_GRID_CELL_SIZE);
  return {
    columns,
    rows,
    cellSize,
    frameWidth,
    frameHeight,
    aspectDelta,
    cellDelta,
    score: aspectDelta * 1000 + cellDelta
  };
};
const getExactBackgroundGridPresets = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let minimumCellSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MIN_GRID_CELL_SIZE;
  const imageWidth = Math.round(Number(config.imageWidth) || 0);
  const imageHeight = Math.round(Number(config.imageHeight) || 0);
  if (imageWidth <= 0 || imageHeight <= 0) {
    return [];
  }
  const aspectRatio = imageWidth / imageHeight;
  const approxColumns = clampGridCount(imageWidth / TARGET_GRID_CELL_SIZE, DEFAULT_FINITE_COLUMNS);
  const approxRows = clampGridCount(imageHeight / TARGET_GRID_CELL_SIZE, DEFAULT_FINITE_ROWS);
  const candidates = new globalThis.Map();
  const addCandidate = (columns, rows) => {
    if (columns < MIN_GRID_COUNT || rows < MIN_GRID_COUNT) return;
    const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
    if (preset.cellSize < minimumCellSize) return;
    const key = "".concat(preset.columns, "x").concat(preset.rows);
    const existingPreset = candidates.get(key);
    if (!existingPreset || preset.score < existingPreset.score) {
      candidates.set(key, preset);
    }
  };
  for (let delta = -18; delta <= 18; delta += 1) {
    const columns = approxColumns + delta;
    const derivedRows = Math.max(1, Math.round(columns / aspectRatio));
    addCandidate(columns, derivedRows - 1);
    addCandidate(columns, derivedRows);
    addCandidate(columns, derivedRows + 1);
  }
  for (let delta = -12; delta <= 12; delta += 1) {
    const rows = approxRows + delta;
    const derivedColumns = Math.max(1, Math.round(rows * aspectRatio));
    addCandidate(derivedColumns - 1, rows);
    addCandidate(derivedColumns, rows);
    addCandidate(derivedColumns + 1, rows);
  }
  addCandidate(DEFAULT_FINITE_COLUMNS, DEFAULT_FINITE_ROWS);
  addCandidate(approxColumns, approxRows);
  return Array.from(candidates.values()).sort((a, b) => {
    if (b.cellSize !== a.cellSize) return b.cellSize - a.cellSize;
    if (a.aspectDelta !== b.aspectDelta) return a.aspectDelta - b.aspectDelta;
    return a.cellDelta - b.cellDelta;
  });
};
const findClosestBackgroundGridPreset = function () {
  let presets = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let key = arguments.length > 1 ? arguments[1] : undefined;
  let rawTarget = arguments.length > 2 ? arguments[2] : undefined;
  if (!Array.isArray(presets) || presets.length === 0) return null;
  const target = Number(rawTarget);
  if (!Number.isFinite(target)) {
    return presets[presets.length - 1];
  }
  return presets.reduce((bestPreset, currentPreset) => {
    if (!bestPreset) return currentPreset;
    const currentDistance = Math.abs((Number(currentPreset[key]) || 0) - target);
    const bestDistance = Math.abs((Number(bestPreset[key]) || 0) - target);
    if (currentDistance !== bestDistance) {
      return currentDistance < bestDistance ? currentPreset : bestPreset;
    }
    return (Number(currentPreset.cellSize) || 0) > (Number(bestPreset.cellSize) || 0) ? currentPreset : bestPreset;
  }, null);
};
const resolveBackgroundGridChange = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let key = arguments.length > 1 ? arguments[1] : undefined;
  let rawValue = arguments.length > 2 ? arguments[2] : undefined;
  const imageWidth = Math.round(Number(config.imageWidth) || 0);
  const imageHeight = Math.round(Number(config.imageHeight) || 0);
  if (imageWidth <= 0 || imageHeight <= 0) {
    return {
      columns: clampGridCount(config.columns, grid_DEFAULT_GRID_CONFIG.columns),
      rows: clampGridCount(config.rows, grid_DEFAULT_GRID_CONFIG.rows),
      cellWidth: clampCellSize(config.cellWidth, grid_DEFAULT_GRID_CONFIG.cellWidth),
      cellHeight: clampCellSize(config.cellHeight, grid_DEFAULT_GRID_CONFIG.cellHeight)
    };
  }
  const presets = getExactBackgroundGridPresets({
    imageWidth,
    imageHeight
  }, MIN_GRID_CELL_SIZE);
  const aspectRatio = imageWidth / imageHeight;
  if (key === 'columns') {
    const columns = clampGridCount(rawValue, clampGridCount(config.columns, grid_DEFAULT_GRID_CONFIG.columns));
    const rows = clampGridCount(Math.round(columns / aspectRatio), DEFAULT_FINITE_ROWS);
    const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
    return {
      columns: preset.columns,
      rows: preset.rows,
      cellWidth: preset.cellSize,
      cellHeight: preset.cellSize
    };
  }
  if (key === 'rows') {
    const rows = clampGridCount(rawValue, clampGridCount(config.rows, grid_DEFAULT_GRID_CONFIG.rows));
    const columns = clampGridCount(Math.round(rows * aspectRatio), DEFAULT_FINITE_COLUMNS);
    const preset = buildBackgroundGridPreset(imageWidth, imageHeight, columns, rows);
    return {
      columns: preset.columns,
      rows: preset.rows,
      cellWidth: preset.cellSize,
      cellHeight: preset.cellSize
    };
  }
  const targetCellSize = clampCellSize(rawValue, TARGET_GRID_CELL_SIZE);
  const matchedPreset = findClosestBackgroundGridPreset(presets, 'cellSize', targetCellSize) || buildBackgroundGridPreset(imageWidth, imageHeight, imageWidth / targetCellSize, imageHeight / targetCellSize);
  return {
    columns: matchedPreset.columns,
    rows: matchedPreset.rows,
    cellWidth: matchedPreset.cellSize,
    cellHeight: matchedPreset.cellSize
  };
};
const getBackgroundGridPresetIndex = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let presets = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  if (!Array.isArray(presets) || presets.length === 0) return 0;
  const exactIndex = presets.findIndex(preset => Number(preset.columns) === Number(config.columns) && Number(preset.rows) === Number(config.rows) && Number(preset.cellSize) === Number(config.cellWidth));
  if (exactIndex >= 0) return exactIndex;
  const closestPreset = findClosestBackgroundGridPreset(presets, 'cellSize', config.cellWidth);
  const closestIndex = presets.findIndex(preset => Number(preset.columns) === Number(closestPreset === null || closestPreset === void 0 ? void 0 : closestPreset.columns) && Number(preset.rows) === Number(closestPreset === null || closestPreset === void 0 ? void 0 : closestPreset.rows) && Number(preset.cellSize) === Number(closestPreset === null || closestPreset === void 0 ? void 0 : closestPreset.cellSize));
  return closestIndex >= 0 ? closestIndex : 0;
};
;// ./src/features/tactical-shared/spatial.js

// Coordinate and geometry helpers contain no game-mode rules.

const GRID_SIZE = 50; // Tamaño de la celda en px
const WORLD_SIZE = 12000; // Tamaño del mundo canvas en px (Aumentado para mapas 4k)

const spatial_getGridWorldRect = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (config.isInfinite) {
    return {
      x: 0,
      y: 0,
      width: WORLD_SIZE,
      height: WORLD_SIZE
    };
  }
  const frameDimensions = getFiniteMapDimensions(config);
  const gridDimensions = getGridPixelDimensions(config);
  return {
    x: (WORLD_SIZE - frameDimensions.width) / 2,
    y: (WORLD_SIZE - frameDimensions.height) / 2,
    width: gridDimensions.width,
    height: gridDimensions.height
  };
};
const clampToRange = (value, min, max) => Math.min(Math.max(value, min), max);
const getEffectiveItemSnap = function (item) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!item) return false;
  if (item.snapToGrid !== undefined) return !!item.snapToGrid;
  return !!config.snapToGrid;
};
const snapWorldPositionToGrid = function () {
  let worldPos = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let itemSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const cellWidth = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellHeight = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const gridRect = spatial_getGridWorldRect(config);
  const itemWidth = Math.max(0, Number(itemSize.width) || 0);
  const itemHeight = Math.max(0, Number(itemSize.height) || 0);
  const shouldCenterInCell = !!options.centerInCell;
  const compactOffsetX = shouldCenterInCell && itemWidth > 0 && itemWidth < cellWidth ? (cellWidth - itemWidth) / 2 : 0;
  const compactOffsetY = shouldCenterInCell && itemHeight > 0 && itemHeight < cellHeight ? (cellHeight - itemHeight) / 2 : 0;
  let x = gridRect.x + Math.round(((Number(worldPos.x) || 0) - gridRect.x - compactOffsetX) / cellWidth) * cellWidth + compactOffsetX;
  let y = gridRect.y + Math.round(((Number(worldPos.y) || 0) - gridRect.y - compactOffsetY) / cellHeight) * cellHeight + compactOffsetY;
  if (!config.isInfinite) {
    x = clampToRange(x, gridRect.x, gridRect.x + gridRect.width - itemWidth);
    y = clampToRange(y, gridRect.y, gridRect.y + gridRect.height - itemHeight);
  }
  return {
    x: roundGridValue(x),
    y: roundGridValue(y)
  };
};
const getCenteredSpawnPosition = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let itemSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const width = Number(itemSize.width) || Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const height = Number(itemSize.height) || Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const centeredPosition = {
    x: WORLD_SIZE / 2 - width / 2,
    y: WORLD_SIZE / 2 - height / 2
  };
  return getEffectiveItemSnap({
    snapToGrid: config.snapToGrid
  }, config) ? snapWorldPositionToGrid(centeredPosition, config, {
    width,
    height
  }, options) : centeredPosition;
};
const adjustItemsForGridChange = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let previousConfig = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let nextConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (previousConfig.backgroundImage || nextConfig.backgroundImage) {
    return items;
  }
  const previousCellWidth = Number(previousConfig.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const previousCellHeight = Number(previousConfig.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const nextCellWidth = Number(nextConfig.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const nextCellHeight = Number(nextConfig.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  if (Math.abs(previousCellWidth - nextCellWidth) < 0.001 && Math.abs(previousCellHeight - nextCellHeight) < 0.001) {
    return items;
  }
  const previousRect = spatial_getGridWorldRect(previousConfig);
  const nextRect = spatial_getGridWorldRect(nextConfig);
  const convertX = value => roundGridValue(nextRect.x + ((Number(value) || 0) - previousRect.x) / previousCellWidth * nextCellWidth);
  const convertY = value => roundGridValue(nextRect.y + ((Number(value) || 0) - previousRect.y) / previousCellHeight * nextCellHeight);
  const convertWidth = value => roundGridValue((Number(value) || nextCellWidth) / previousCellWidth * nextCellWidth);
  const convertHeight = value => roundGridValue((Number(value) || nextCellHeight) / previousCellHeight * nextCellHeight);
  return items.map(item => {
    if (!getEffectiveItemSnap(item, previousConfig)) {
      return item;
    }
    if (item.type === 'wall') {
      const x1 = convertX(item.x1);
      const y1 = convertY(item.y1);
      const x2 = convertX(item.x2);
      const y2 = convertY(item.y2);
      return _objectSpread(_objectSpread({}, item), {}, {
        x1,
        y1,
        x2,
        y2,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.max(Math.abs(x2 - x1), 5),
        height: Math.max(Math.abs(y2 - y1), 5)
      });
    }
    const width = Math.max(convertWidth(item.width), 5);
    const height = Math.max(convertHeight(item.height), 5);
    let x = convertX(item.x);
    let y = convertY(item.y);
    if (!nextConfig.isInfinite) {
      x = clampToRange(x, nextRect.x, nextRect.x + nextRect.width - width);
      y = clampToRange(y, nextRect.y, nextRect.y + nextRect.height - height);
    }
    return _objectSpread(_objectSpread({}, item), {}, {
      x,
      y,
      width,
      height
    });
  });
};

// Helpers matemáticos para Muros y Colisiones
const spatial_linesIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (det === 0) return false;
  const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  const gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  return 0 <= lambda && lambda <= 1 && 0 <= gamma && gamma <= 1;
};

// Genera los puntos de un polígono de sombra proyectado
const calculateShadowPoints = function (lx, ly, x1, y1, x2, y2) {
  let projection = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 10000;
  // Protección contra valores no numéricos que romperían el SVG en móvil
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
    return "0,0 0,0 0,0 0,0";
  }

  // Calculamos la dirección del muro para extenderlo un poco (1px) y evitar fugas en las esquinas
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nudge = 1.5; // Pequeño margen para solapar sombras en las uniones

  const nx1 = x1 - dx / len * nudge;
  const ny1 = y1 - dy / len * nudge;
  const nx2 = x2 + dx / len * nudge;
  const ny2 = y2 + dy / len * nudge;
  const angle1 = Math.atan2(ny1 - ly, nx1 - lx);
  const angle2 = Math.atan2(ny2 - ly, nx2 - lx);
  const px1 = nx1 + Math.cos(angle1) * projection;
  const py1 = ny1 + Math.sin(angle1) * projection;
  const px2 = nx2 + Math.cos(angle2) * projection;
  const py2 = ny2 + Math.sin(angle2) * projection;
  return "".concat(nx1, ",").concat(ny1, " ").concat(nx2, ",").concat(ny2, " ").concat(px2, ",").concat(py2, " ").concat(px1, ",").concat(py1);
};
const spatial_lineRectIntersect = (x1, y1, x2, y2, rx, ry, rw, rh) => {
  // 1. Verificar si alguno de los puntos finales está dentro del rectángulo
  const isInside = (px, py) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  if (isInside(x1, y1) || isInside(x2, y2)) return true;

  // 2. Verificar intersección con los 4 lados del rectángulo
  const sides = [[rx, ry, rx + rw, ry],
  // Top
  [rx + rw, ry, rx + rw, ry + rh],
  // Right
  [rx + rw, ry + rh, rx, ry + rh],
  // Bottom
  [rx, ry + rh, rx, ry] // Left
  ];
  return sides.some(side => spatial_linesIntersect(x1, y1, x2, y2, side[0], side[1], side[2], side[3]));
};
;// ./src/features/tactical-shared/tarTerrain.js


const isTarZone = item => {
  var _item$areaEffect;
  return (item === null || item === void 0 ? void 0 : item.type) === 'geometry' && (item.geometryKind === 'tar' || ((_item$areaEffect = item.areaEffect) === null || _item$areaEffect === void 0 ? void 0 : _item$areaEffect.type) === 'tar');
};
const getTerrainCells = function (item) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const grid = getGridWorldRect(config);
  const w = Number(config.cellWidth) || 50;
  const h = Number(config.cellHeight) || 50;
  const cells = [];
  if (item.type !== 'geometry') {
    const column = Math.round((item.x - grid.x) / w);
    const row = Math.round((item.y - grid.y) / h);
    for (let dy = 0; dy < Math.max(1, Math.round((item.height || h) / h)); dy += 1) for (let dx = 0; dx < Math.max(1, Math.round((item.width || w) / w)); dx += 1) cells.push({
      column: column + dx,
      row: row + dy
    });
    return cells;
  }
  for (let row = Math.floor((item.y - grid.y + 0.001) / h); row < Math.ceil((item.y + (item.height || h) - grid.y - 0.001) / h); row += 1) {
    for (let column = Math.floor((item.x - grid.x + 0.001) / w); column < Math.ceil((item.x + (item.width || w) - grid.x - 0.001) / w); column += 1) cells.push({
      column,
      row
    });
  }
  return cells;
};
const key = cell => "".concat(cell.column, ":").concat(cell.row);
const getTokenTarCoverage = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!token) return 0;
  const cells = getTerrainCells(token, config);
  const tarCells = new Set(items.filter(isTarZone).flatMap(item => getTerrainCells(item, config)).map(key));
  return cells.length ? cells.filter(cell => tarCells.has(key(cell))).length / cells.length : 0;
};
const neighbors = cell => [cell, {
  column: cell.column - 1,
  row: cell.row
}, {
  column: cell.column + 1,
  row: cell.row
}, {
  column: cell.column,
  row: cell.row - 1
}, {
  column: cell.column,
  row: cell.row + 1
}];

// Price each entered cell along the same straight route used by dragging.
// Multiple overlapping terrain sources never multiply the surcharge.
const tarTerrain_getTerrainMovementCost = _ref => {
  let {
    token,
    from,
    to,
    items = [],
    config = {},
    exceptional = false
  } = _ref;
  const w = Number(config.cellWidth) || 50;
  const h = Number(config.cellHeight) || 50;
  const steps = Math.max(Math.round(Math.abs(to.x - from.x) / w), Math.round(Math.abs(to.y - from.y) / h));
  if (!steps || exceptional) return steps;
  const terrain = items.filter(item => {
    var _item$areaEffect2;
    return isTarZone(item) || ((_item$areaEffect2 = item.areaEffect) === null || _item$areaEffect2 === void 0 ? void 0 : _item$areaEffect2.difficultTerrain);
  });
  if (!terrain.length) return steps;
  const occupied = new Set(terrain.flatMap(item => getTerrainCells(item, config)).map(key));
  let cost = 0;
  for (let step = 1; step <= steps; step += 1) {
    const position = _objectSpread(_objectSpread({}, token), {}, {
      x: from.x + Math.round((to.x - from.x) / w * step / steps) * w,
      y: from.y + Math.round((to.y - from.y) / h * step / steps) * h
    });
    cost += getTerrainCells(position, config).some(cell => occupied.has(key(cell))) ? 2 : 1;
  }
  return cost;
};
const resolveTarIgnition = _ref2 => {
  let {
    items = [],
    fireCells = [],
    config = {}
  } = _ref2;
  const zones = items.filter(isTarZone);
  const cells = new Map(zones.flatMap(zone => getTerrainCells(zone, config)).map(cell => [key(cell), cell]));
  const queue = fireCells.flatMap(neighbors).filter(cell => cells.has(key(cell)));
  const burned = new Map();
  while (queue.length) {
    const cell = queue.pop();
    if (burned.has(key(cell))) continue;
    burned.set(key(cell), cell);
    neighbors(cell).forEach(next => {
      if (cells.has(key(next)) && !burned.has(key(next))) queue.push(next);
    });
  }
  return {
    cells: [...burned.values()],
    zoneIds: zones.filter(zone => getTerrainCells(zone, config).some(cell => burned.has(key(cell)))).map(zone => zone.id)
  };
};
// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(540);
;// ./node_modules/lucide-react/dist/esm/shared/src/utils.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
const mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};


//# sourceMappingURL=utils.js.map

;// ./node_modules/lucide-react/dist/esm/defaultAttributes.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};


//# sourceMappingURL=defaultAttributes.js.map

;// ./node_modules/lucide-react/dist/esm/Icon.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */





const Icon = (0,react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => (0,react.createElement)(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => (0,react.createElement)(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);


//# sourceMappingURL=Icon.js.map

;// ./node_modules/lucide-react/dist/esm/createLucideIcon.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */





const createLucideIcon = (iconName, iconNode) => {
  const Component = (0,react.forwardRef)(
    ({ className, ...props }, ref) => (0,react.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};


//# sourceMappingURL=createLucideIcon.js.map

;// ./node_modules/lucide-react/dist/esm/icons/droplet.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const __iconNode = [
  [
    "path",
    {
      d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
      key: "c7niix"
    }
  ]
];
const Droplet = createLucideIcon("droplet", __iconNode);


//# sourceMappingURL=droplet.js.map

;// ./node_modules/lucide-react/dist/esm/icons/lock.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const lock_iconNode = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
const Lock = createLucideIcon("lock", lock_iconNode);


//# sourceMappingURL=lock.js.map

;// ./node_modules/lucide-react/dist/esm/icons/flame.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const flame_iconNode = [
  [
    "path",
    {
      d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
      key: "96xj49"
    }
  ]
];
const Flame = createLucideIcon("flame", flame_iconNode);


//# sourceMappingURL=flame.js.map

;// ./node_modules/lucide-react/dist/esm/icons/wind.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const wind_iconNode = [
  ["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2", key: "148xed" }],
  ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2", key: "1u4tom" }],
  ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2", key: "75valh" }]
];
const Wind = createLucideIcon("wind", wind_iconNode);


//# sourceMappingURL=wind.js.map

;// ./node_modules/lucide-react/dist/esm/icons/ghost.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const ghost_iconNode = [
  ["path", { d: "M9 10h.01", key: "qbtxuw" }],
  ["path", { d: "M15 10h.01", key: "1qmjsl" }],
  [
    "path",
    {
      d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",
      key: "uwwb07"
    }
  ]
];
const Ghost = createLucideIcon("ghost", ghost_iconNode);


//# sourceMappingURL=ghost.js.map

;// ./node_modules/lucide-react/dist/esm/icons/zap.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const zap_iconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
];
const Zap = createLucideIcon("zap", zap_iconNode);


//# sourceMappingURL=zap.js.map

;// ./node_modules/lucide-react/dist/esm/icons/battery-low.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const battery_low_iconNode = [
  ["path", { d: "M22 14v-4", key: "14q9d5" }],
  ["path", { d: "M6 14v-4", key: "14a6bd" }],
  ["rect", { x: "2", y: "6", width: "16", height: "12", rx: "2", key: "13zb55" }]
];
const BatteryLow = createLucideIcon("battery-low", battery_low_iconNode);


//# sourceMappingURL=battery-low.js.map

;// ./node_modules/lucide-react/dist/esm/icons/eye-off.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const eye_off_iconNode = [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      key: "ct8e1f"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      key: "13bj9a"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
];
const EyeOff = createLucideIcon("eye-off", eye_off_iconNode);


//# sourceMappingURL=eye-off.js.map

;// ./node_modules/lucide-react/dist/esm/icons/snowflake.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const snowflake_iconNode = [
  ["path", { d: "m10 20-1.25-2.5L6 18", key: "18frcb" }],
  ["path", { d: "M10 4 8.75 6.5 6 6", key: "7mghy3" }],
  ["path", { d: "m14 20 1.25-2.5L18 18", key: "1chtki" }],
  ["path", { d: "m14 4 1.25 2.5L18 6", key: "1b4wsy" }],
  ["path", { d: "m17 21-3-6h-4", key: "15hhxa" }],
  ["path", { d: "m17 3-3 6 1.5 3", key: "11697g" }],
  ["path", { d: "M2 12h6.5L10 9", key: "kv9z4n" }],
  ["path", { d: "m20 10-1.5 2 1.5 2", key: "1swlpi" }],
  ["path", { d: "M22 12h-6.5L14 15", key: "1mxi28" }],
  ["path", { d: "m4 10 1.5 2L4 14", key: "k9enpj" }],
  ["path", { d: "m7 21 3-6-1.5-3", key: "j8hb9u" }],
  ["path", { d: "m7 3 3 6h4", key: "1otusx" }]
];
const Snowflake = createLucideIcon("snowflake", snowflake_iconNode);


//# sourceMappingURL=snowflake.js.map

;// ./node_modules/lucide-react/dist/esm/icons/arrow-down.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const arrow_down_iconNode = [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
];
const ArrowDown = createLucideIcon("arrow-down", arrow_down_iconNode);


//# sourceMappingURL=arrow-down.js.map

;// ./node_modules/lucide-react/dist/esm/icons/biohazard.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const biohazard_iconNode = [
  ["circle", { cx: "12", cy: "11.9", r: "2", key: "e8h31w" }],
  ["path", { d: "M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 9 3.7 9.6 2 11.6", key: "17bolr" }],
  ["path", { d: "m8.9 10.1 1.4.8", key: "15ezny" }],
  ["path", { d: "M17.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4-1.2 5.2-.6 6.9 1.5", key: "wtwa5u" }],
  ["path", { d: "m15.1 10.1-1.4.8", key: "1r0b28" }],
  ["path", { d: "M16.7 20.8c-2.6-.4-4.6-2.6-4.7-5.3-.2 2.6-2.1 4.8-4.7 5.2", key: "m7qszh" }],
  ["path", { d: "M12 13.9v1.6", key: "zfyyim" }],
  ["path", { d: "M13.5 5.4c-1-.2-2-.2-3 0", key: "1bi9q0" }],
  ["path", { d: "M17 16.4c.7-.7 1.2-1.6 1.5-2.5", key: "1rhjqw" }],
  ["path", { d: "M5.5 13.9c.3.9.8 1.8 1.5 2.5", key: "8gsud3" }]
];
const Biohazard = createLucideIcon("biohazard", biohazard_iconNode);


//# sourceMappingURL=biohazard.js.map

;// ./node_modules/lucide-react/dist/esm/icons/volume-x.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const volume_x_iconNode = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15", key: "1ewh16" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15", key: "5ykzw1" }]
];
const VolumeX = createLucideIcon("volume-x", volume_x_iconNode);


//# sourceMappingURL=volume-x.js.map

;// ./node_modules/lucide-react/dist/esm/icons/skull.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const skull_iconNode = [
  ["path", { d: "m12.5 17-.5-1-.5 1h1z", key: "3me087" }],
  [
    "path",
    {
      d: "M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z",
      key: "1o5pge"
    }
  ],
  ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
  ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }]
];
const Skull = createLucideIcon("skull", skull_iconNode);


//# sourceMappingURL=skull.js.map

;// ./node_modules/lucide-react/dist/esm/icons/heart-crack.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const heart_crack_iconNode = [
  [
    "path",
    {
      d: "M12.409 5.824c-.702.792-1.15 1.496-1.415 2.166l2.153 2.156a.5.5 0 0 1 0 .707l-2.293 2.293a.5.5 0 0 0 0 .707L12 15",
      key: "idzbju"
    }
  ],
  [
    "path",
    {
      d: "M13.508 20.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.677.6.6 0 0 0 .818.001A5.5 5.5 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5z",
      key: "1su70f"
    }
  ]
];
const HeartCrack = createLucideIcon("heart-crack", heart_crack_iconNode);


//# sourceMappingURL=heart-crack.js.map

;// ./node_modules/lucide-react/dist/esm/icons/sun.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const sun_iconNode = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
];
const Sun = createLucideIcon("sun", sun_iconNode);


//# sourceMappingURL=sun.js.map

;// ./node_modules/lucide-react/dist/esm/icons/heart.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const heart_iconNode = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
      key: "mvr1a0"
    }
  ]
];
const Heart = createLucideIcon("heart", heart_iconNode);


//# sourceMappingURL=heart.js.map

;// ./node_modules/lucide-react/dist/esm/icons/mic-off.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const mic_off_iconNode = [
  ["path", { d: "M12 19v3", key: "npa21l" }],
  ["path", { d: "M15 9.34V5a3 3 0 0 0-5.68-1.33", key: "1gzdoj" }],
  ["path", { d: "M16.95 16.95A7 7 0 0 1 5 12v-2", key: "cqa7eg" }],
  ["path", { d: "M18.89 13.23A7 7 0 0 0 19 12v-2", key: "16hl24" }],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }],
  ["path", { d: "M9 9v3a3 3 0 0 0 5.12 2.12", key: "r2i35w" }]
];
const MicOff = createLucideIcon("mic-off", mic_off_iconNode);


//# sourceMappingURL=mic-off.js.map

;// ./node_modules/lucide-react/dist/esm/icons/circle-alert.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const circle_alert_iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
];
const CircleAlert = createLucideIcon("circle-alert", circle_alert_iconNode);


//# sourceMappingURL=circle-alert.js.map

;// ./node_modules/lucide-react/dist/esm/icons/shield.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const shield_iconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ]
];
const Shield = createLucideIcon("shield", shield_iconNode);


//# sourceMappingURL=shield.js.map

;// ./node_modules/lucide-react/dist/esm/icons/zap-off.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const zap_off_iconNode = [
  ["path", { d: "M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317", key: "193nxd" }],
  ["path", { d: "M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773", key: "27a7lr" }],
  [
    "path",
    {
      d: "M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643",
      key: "1e0qe9"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
];
const ZapOff = createLucideIcon("zap-off", zap_off_iconNode);


//# sourceMappingURL=zap-off.js.map

;// ./node_modules/lucide-react/dist/esm/icons/moon.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const moon_iconNode = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
      key: "kfwtm"
    }
  ]
];
const Moon = createLucideIcon("moon", moon_iconNode);


//# sourceMappingURL=moon.js.map

;// ./node_modules/lucide-react/dist/esm/icons/cloud.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const cloud_iconNode = [
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z", key: "p7xjir" }]
];
const Cloud = createLucideIcon("cloud", cloud_iconNode);


//# sourceMappingURL=cloud.js.map

;// ./node_modules/lucide-react/dist/esm/icons/thermometer.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const thermometer_iconNode = [
  ["path", { d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z", key: "17jzev" }]
];
const Thermometer = createLucideIcon("thermometer", thermometer_iconNode);


//# sourceMappingURL=thermometer.js.map

;// ./node_modules/lucide-react/dist/esm/icons/flask-conical.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const flask_conical_iconNode = [
  [
    "path",
    {
      d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",
      key: "18mbvz"
    }
  ],
  ["path", { d: "M6.453 15h11.094", key: "3shlmq" }],
  ["path", { d: "M8.5 2h7", key: "csnxdl" }]
];
const FlaskConical = createLucideIcon("flask-conical", flask_conical_iconNode);


//# sourceMappingURL=flask-conical.js.map

;// ./node_modules/lucide-react/dist/esm/icons/crosshair.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const crosshair_iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "22", x2: "18", y1: "12", y2: "12", key: "l9bcsi" }],
  ["line", { x1: "6", x2: "2", y1: "12", y2: "12", key: "13hhkx" }],
  ["line", { x1: "12", x2: "12", y1: "6", y2: "2", key: "10w3f3" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "18", key: "15g9kq" }]
];
const Crosshair = createLucideIcon("crosshair", crosshair_iconNode);


//# sourceMappingURL=crosshair.js.map

;// ./node_modules/lucide-react/dist/esm/icons/activity.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const activity_iconNode = [
  [
    "path",
    {
      d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
      key: "169zse"
    }
  ]
];
const Activity = createLucideIcon("activity", activity_iconNode);


//# sourceMappingURL=activity.js.map

;// ./node_modules/lucide-react/dist/esm/icons/anchor.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const anchor_iconNode = [
  ["path", { d: "M12 22V8", key: "qkxhtm" }],
  ["path", { d: "M5 12H2a10 10 0 0 0 20 0h-3", key: "1hv3nh" }],
  ["circle", { cx: "12", cy: "5", r: "3", key: "rqqgnr" }]
];
const Anchor = createLucideIcon("anchor", anchor_iconNode);


//# sourceMappingURL=anchor.js.map

;// ./node_modules/lucide-react/dist/esm/icons/award.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const award_iconNode = [
  [
    "path",
    {
      d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",
      key: "1yiouv"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "6", key: "1vp47v" }]
];
const Award = createLucideIcon("award", award_iconNode);


//# sourceMappingURL=award.js.map

;// ./node_modules/lucide-react/dist/esm/icons/book.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const book_iconNode = [
  [
    "path",
    {
      d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",
      key: "k3hazp"
    }
  ]
];
const Book = createLucideIcon("book", book_iconNode);


//# sourceMappingURL=book.js.map

;// ./node_modules/lucide-react/dist/esm/icons/camera.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const camera_iconNode = [
  [
    "path",
    {
      d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
      key: "1tc9qg"
    }
  ],
  ["circle", { cx: "12", cy: "13", r: "3", key: "1vg3eu" }]
];
const Camera = createLucideIcon("camera", camera_iconNode);


//# sourceMappingURL=camera.js.map

;// ./node_modules/lucide-react/dist/esm/icons/coffee.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const coffee_iconNode = [
  ["path", { d: "M10 2v2", key: "7u0qdc" }],
  ["path", { d: "M14 2v2", key: "6buw04" }],
  [
    "path",
    {
      d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
      key: "pwadti"
    }
  ],
  ["path", { d: "M6 2v2", key: "colzsn" }]
];
const Coffee = createLucideIcon("coffee", coffee_iconNode);


//# sourceMappingURL=coffee.js.map

;// ./node_modules/lucide-react/dist/esm/icons/gift.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const gift_iconNode = [
  ["rect", { x: "3", y: "8", width: "18", height: "4", rx: "1", key: "bkv52" }],
  ["path", { d: "M12 8v13", key: "1c76mn" }],
  ["path", { d: "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", key: "6wjy6b" }],
  [
    "path",
    {
      d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",
      key: "1ihvrl"
    }
  ]
];
const Gift = createLucideIcon("gift", gift_iconNode);


//# sourceMappingURL=gift.js.map

;// ./node_modules/lucide-react/dist/esm/icons/house.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const house_iconNode = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "1d0kgt"
    }
  ]
];
const House = createLucideIcon("house", house_iconNode);


//# sourceMappingURL=house.js.map

;// ./node_modules/lucide-react/dist/esm/icons/key.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const key_iconNode = [
  ["path", { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4", key: "g0fldk" }],
  ["path", { d: "m21 2-9.6 9.6", key: "1j0ho8" }],
  ["circle", { cx: "7.5", cy: "15.5", r: "5.5", key: "yqb3hr" }]
];
const Key = createLucideIcon("key", key_iconNode);


//# sourceMappingURL=key.js.map

;// ./node_modules/lucide-react/dist/esm/icons/map.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const map_iconNode = [
  [
    "path",
    {
      d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
      key: "169xi5"
    }
  ],
  ["path", { d: "M15 5.764v15", key: "1pn4in" }],
  ["path", { d: "M9 3.236v15", key: "1uimfh" }]
];
const map_Map = createLucideIcon("map", map_iconNode);


//# sourceMappingURL=map.js.map

;// ./node_modules/lucide-react/dist/esm/icons/music.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const music_iconNode = [
  ["path", { d: "M9 18V5l12-2v13", key: "1jmyc2" }],
  ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
  ["circle", { cx: "18", cy: "16", r: "3", key: "1hluhg" }]
];
const Music = createLucideIcon("music", music_iconNode);


//# sourceMappingURL=music.js.map

;// ./node_modules/lucide-react/dist/esm/icons/phone.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const phone_iconNode = [
  [
    "path",
    {
      d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
      key: "9njp5v"
    }
  ]
];
const Phone = createLucideIcon("phone", phone_iconNode);


//# sourceMappingURL=phone.js.map

;// ./node_modules/lucide-react/dist/esm/icons/search.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const search_iconNode = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", search_iconNode);


//# sourceMappingURL=search.js.map

;// ./node_modules/lucide-react/dist/esm/icons/settings.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const settings_iconNode = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", settings_iconNode);


//# sourceMappingURL=settings.js.map

;// ./node_modules/lucide-react/dist/esm/icons/shopping-cart.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const shopping_cart_iconNode = [
  ["circle", { cx: "8", cy: "21", r: "1", key: "jimo8o" }],
  ["circle", { cx: "19", cy: "21", r: "1", key: "13723u" }],
  [
    "path",
    {
      d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
      key: "9zh506"
    }
  ]
];
const ShoppingCart = createLucideIcon("shopping-cart", shopping_cart_iconNode);


//# sourceMappingURL=shopping-cart.js.map

;// ./node_modules/lucide-react/dist/esm/icons/star.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const star_iconNode = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
];
const Star = createLucideIcon("star", star_iconNode);


//# sourceMappingURL=star.js.map

;// ./node_modules/lucide-react/dist/esm/icons/trash.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const trash_iconNode = [
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
const Trash = createLucideIcon("trash", trash_iconNode);


//# sourceMappingURL=trash.js.map

;// ./node_modules/lucide-react/dist/esm/icons/user.js
/**
 * @license lucide-react v0.539.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const user_iconNode = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
];
const User = createLucideIcon("user", user_iconNode);


//# sourceMappingURL=user.js.map

;// ./src/utils/statusEffects.js

const ICON_MAP = {
  Droplet: Droplet,
  Lock: Lock,
  Flame: Flame,
  Wind: Wind,
  Ghost: Ghost,
  Zap: Zap,
  BatteryLow: BatteryLow,
  EyeOff: EyeOff,
  Snowflake: Snowflake,
  ArrowDown: ArrowDown,
  Biohazard: Biohazard,
  VolumeX: VolumeX,
  Skull: Skull,
  HeartCrack: HeartCrack,
  Sun: Sun,
  Heart: Heart,
  MicOff: MicOff,
  AlertCircle: CircleAlert,
  Shield: Shield,
  ZapOff: ZapOff,
  Moon: Moon,
  Cloud: Cloud,
  Thermometer: Thermometer,
  FlaskConical: FlaskConical,
  Crosshair: Crosshair,
  Activity: Activity,
  Anchor: Anchor,
  Award: Award,
  Book: Book,
  Camera: Camera,
  Coffee: Coffee,
  Gift: Gift,
  Home: House,
  Key: Key,
  Map: map_Map,
  Music: Music,
  Phone: Phone,
  Search: Search,
  Settings: Settings,
  ShoppingCart: ShoppingCart,
  Star: Star,
  Trash: Trash,
  User: User
};
const statusEffects_HIDDEN_STATUS_EFFECT_ID = 'oculto';
const statusEffects_DEFAULT_STATUS_EFFECTS = {
  'acido': {
    label: 'Ácido',
    iconName: 'Droplet',
    color: 'text-lime-400',
    bg: 'bg-lime-400/10',
    border: 'border-lime-400/50',
    hex: '#a3e635',
    desc: 'Pierdes una propiedad de armadura hasta que tu u otro personaje realice la acción de REPARAR sobre la armadura.'
  },
  'apresado': {
    label: 'Apresado',
    iconName: 'Lock',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/50',
    hex: '#fb923c',
    desc: 'No puedes realizar acciones de evasión ni de movimiento hasta que tu u otro personaje realice la acción de LIBERAR sobre ti.'
  },
  'ardiendo': {
    label: 'Ardiendo',
    iconName: 'Flame',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    hex: '#ef4444',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de APAGAR sobre ti, pierdes un bloque de cuerpo o de mente.'
  },
  'asfixiado': {
    label: 'Asfixiado',
    iconName: 'Wind',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/50',
    hex: '#94a3b8',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de RESPIRAR sobre ti, pierdes un bloque de cuerpo.'
  },
  'asustado': {
    label: 'Asustado',
    iconName: 'Ghost',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/50',
    hex: '#c084fc',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRANQUILIZAR sobre ti, pierdes un bloque de mente.'
  },
  'aturdido': {
    label: 'Aturdido',
    iconName: 'Zap',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/50',
    hex: '#facc15',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de ESPABILAR sobre ti, pierdes un bloque de mente.'
  },
  'cansado': {
    label: 'Cansado',
    iconName: 'BatteryLow',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/50',
    hex: '#fbbf24',
    desc: 'Por cada tiempo que gastes hasta que realices la acción de DESCANSAR, pierdes un bloque de cuerpo.'
  },
  'cegado': {
    label: 'Cegado',
    iconName: 'EyeOff',
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/50',
    hex: '#9ca3af',
    desc: 'Por cada tiempo que gastes para realizar una tirada hasta que realices la acción de ACLARAR, se anula un dado del resultado.'
  },
  'congelado': {
    label: 'Congelado',
    iconName: 'Snowflake',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/50',
    hex: '#22d3ee',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de CALENTAR sobre ti, pierdes un bloque de cuerpo o de mente.'
  },
  'derribado': {
    label: 'Derribado',
    iconName: 'ArrowDown',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/50',
    hex: '#818cf8',
    desc: 'No puedes defenderte ni realizar acciones de movimiento hasta que tu u otro personaje realice la acción de LEVANTAR sobre tí.'
  },
  'conmocionado': {
    label: 'Conmocionado',
    iconName: 'ArrowDown',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/50',
    hex: '#818cf8',
    desc: 'No puedes defenderte ni realizar acciones de movimiento. Levantarte cuesta 2 de velocidad hasta que te incorpores al final del turno.'
  },
  'enfermo': {
    label: 'Enfermo',
    iconName: 'Biohazard',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    hex: '#22c55e',
    desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRATAR sobre ti, pierdes un bloque de cuerpo o de mente.'
  },
  'oculto': {
    label: 'Oculto',
    imageLabel: 'Cegado',
    iconName: 'EyeOff',
    color: 'text-violet-300',
    bg: 'bg-violet-300/10',
    border: 'border-violet-300/50',
    hex: '#c4b5fd',
    desc: 'El token sólo es visible para quienes lo controlan y para jugadores con el mismo Team ID.'
  },
  'envenenado': {
    label: 'Envenenado',
    iconName: 'Skull',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    hex: '#10b981',
    desc: 'No puedes recuperar Vida por ninguna fuente. No causa daño periódico ni se acumula. Dura hasta el final del combate o hasta que un Antídoto u otro efecto específico lo elimine.'
  },
  'barrera': {
    label: 'Barrera',
    imageUrl: '/estados/Barrera.svg',
    iconName: 'Shield',
    color: 'text-[#dfc885]',
    bg: 'bg-[#dfc885]/10',
    border: 'border-[#dfc885]/50',
    hex: '#dfc885',
    desc: '+1 CD temporal hasta el final del combate. No se acumula. Retirar este estado elimina también su protección y efecto visual.'
  },
  'iluminado': {
    label: 'Iluminado',
    iconName: 'Sun',
    color: 'text-yellow-200',
    bg: 'bg-yellow-200/10',
    border: 'border-yellow-200/50',
    hex: '#fef08a',
    desc: 'Emites luz a tu alrededor.'
  },
  'regeneracion': {
    label: 'Regeneración',
    iconName: 'Heart',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/50',
    hex: '#f472b6',
    desc: 'Por cada tiempo que gastes hasta que recibas daño, recuperas un bloque de cuerpo.'
  },
  'sangrado': {
    label: 'Sangrado',
    iconName: 'Droplet',
    color: 'text-red-700',
    bg: 'bg-red-700/10',
    border: 'border-red-700/50',
    hex: '#b91c1c',
    desc: 'Por cada tiempo que gastes hasta que recibas una curación, pierdes un bloque de cuerpo.'
  },
  'silenciado': {
    label: 'Silenciado',
    iconName: 'MicOff',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/50',
    hex: '#64748b',
    desc: 'No puedes hablar hasta que realices la acción de ACLARAR.'
  }
};
const statusEffects_PRONE_STATUS_IDS = (/* unused pure expression or super */ null && (['derribado', 'conmocionado']));
const NON_SELECTABLE_STATUS_EFFECT_IDS = ['conmocionado', 'ralentizado'];
const DEPRECATED_STATUS_EFFECT_IDS = (/* unused pure expression or super */ null && (['ensordecido', 'herido']));
const mergeStatusEffectsConfig = function () {
  let configuredEffects = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const activeConfiguredEffects = Object.fromEntries(Object.entries(configuredEffects || {}).filter(_ref => {
    let [id] = _ref;
    return !DEPRECATED_STATUS_EFFECT_IDS.includes(id);
  }));
  if (Object.keys(activeConfiguredEffects).length === 0) return statusEffects_DEFAULT_STATUS_EFFECTS;
  const orderedEffects = {};
  Object.entries(statusEffects_DEFAULT_STATUS_EFFECTS).forEach(_ref2 => {
    let [id, defaultEffect] = _ref2;
    if (id === statusEffects_HIDDEN_STATUS_EFFECT_ID || id === 'barrera' || activeConfiguredEffects[id]) {
      orderedEffects[id] = activeConfiguredEffects[id] || defaultEffect;
    }
  });
  Object.entries(activeConfiguredEffects).forEach(_ref3 => {
    let [id, effect] = _ref3;
    if (!orderedEffects[id]) orderedEffects[id] = effect;
  });
  return orderedEffects;
};
const ESTADOS = Object.entries(statusEffects_DEFAULT_STATUS_EFFECTS).filter(_ref4 => {
  let [id] = _ref4;
  return !NON_SELECTABLE_STATUS_EFFECT_IDS.includes(id);
}).map(_ref5 => {
  let [id, config] = _ref5;
  return {
    id,
    name: config.label,
    img: config.imageUrl || "/estados/".concat(config.imageLabel || config.label, ".webp"),
    desc: config.desc,
    hex: config.hex
  };
});
;// ./src/utils/armorSystem.js

const normalizeKey = function () {
  let value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return value.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};
const splitBracketTraits = value => {
  const text = String(value || '');
  const matches = text.match(/\[[^\]]+\]/g);
  if (!matches) return null;
  return matches.map(entry => entry.replace(/[[\]]/g, '').trim()).filter(Boolean);
};
const parseCombatTraits = input => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(value => value !== undefined && value !== null ? value.toString().trim() : '').filter(Boolean);
  }
  const bracketTraits = splitBracketTraits(input);
  if (bracketTraits) return bracketTraits;
  return String(input).split(',').map(value => value.trim()).filter(Boolean);
};
const normalizeCombatTrait = trait => {
  const normalized = normalizeKey(trait);
  const compact = normalized.replace(/[\s_-]+/g, '');
  if (!normalized) return '';
  if (['derribado', 'derribar', 'derribo'].includes(normalized)) return 'derribo';
  if (normalized === 'penetrante') return 'perforante';
  if (normalized === 'balistica') return 'balistico';
  if (normalized === 'bloquear') return 'bloqueo';
  if (normalized === 'ralentizar') return 'ralentizado';
  if (normalized === 'empujar') return 'empuje';
  if (compact === 'singuardia') return 'sin guardia';
  return normalized;
};
const getItemName = item => ((item === null || item === void 0 ? void 0 : item.nombre) || (item === null || item === void 0 ? void 0 : item.name) || (item === null || item === void 0 ? void 0 : item.label) || '').toString().trim();
const armorSystem_getItemTraits = item => parseCombatTraits((item === null || item === void 0 ? void 0 : item.rasgos) || (item === null || item === void 0 ? void 0 : item.traits) || (item === null || item === void 0 ? void 0 : item.trait) || (item === null || item === void 0 ? void 0 : item.properties) || []);
const ARMOR_CD_TRAIT_MAP = new Map([['destreza', 'destreza'], ['dexterity', 'destreza'], ['vigor', 'vigor'], ['intelecto', 'intelecto'], ['intellect', 'intelecto'], ['voluntad', 'voluntad'], ['willpower', 'voluntad']]);
const resolveArmorCdTrait = trait => ARMOR_CD_TRAIT_MAP.get(normalizeKey(trait)) || null;
const getArmorBlocks = armor => {
  var _ref, _ref2, _ref3, _ref4, _ref5, _armor$blocks, _armor$details, _armor$details2;
  const rawValue = (_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_armor$blocks = armor === null || armor === void 0 ? void 0 : armor.blocks) !== null && _armor$blocks !== void 0 ? _armor$blocks : armor === null || armor === void 0 ? void 0 : armor.bloques) !== null && _ref5 !== void 0 ? _ref5 : armor === null || armor === void 0 ? void 0 : armor.defensa) !== null && _ref4 !== void 0 ? _ref4 : armor === null || armor === void 0 ? void 0 : armor.defense) !== null && _ref3 !== void 0 ? _ref3 : armor === null || armor === void 0 ? void 0 : (_armor$details = armor.details) === null || _armor$details === void 0 ? void 0 : _armor$details.blocks) !== null && _ref2 !== void 0 ? _ref2 : armor === null || armor === void 0 ? void 0 : (_armor$details2 = armor.details) === null || _armor$details2 === void 0 ? void 0 : _armor$details2.defense) !== null && _ref !== void 0 ? _ref : '';
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.max(0, Math.floor(rawValue));
  }
  const text = String(rawValue || '').trim();
  if (!text) return 0;
  const numeric = parseInt(text, 10);
  if (!Number.isNaN(numeric)) {
    return Math.max(0, numeric);
  }
  const iconMatches = text.match(/[■□⬛⬜◼◻◾◽▪▫🛡]/g) || text.match(/\[[^\]]+\]/g) || [];
  return iconMatches.length;
};
const isWeaponLikeType = function () {
  let value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  const normalized = normalizeKey(value);
  return normalized.includes('weapon') || normalized.includes('arma') || normalized.includes('ability') || normalized.includes('habilidad') || normalized.includes('power') || normalized.includes('poder');
};
const isArmorItem = function (item) {
  let armorCatalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  if (!item) return false;
  const type = normalizeKey(item.type || item.category || item.slot || item.bodySlot || '');
  if (isWeaponLikeType(type)) return false;
  if (type.includes('armor') || type.includes('armadura')) return true;
  if (normalizeKey((item === null || item === void 0 ? void 0 : item.slot) || (item === null || item === void 0 ? void 0 : item.bodySlot) || '') === 'body') return true;
  return !!findCatalogMatch(armorCatalog, getItemName(item));
};
const flattenItem = item => {
  if (!item) return null;
  if (typeof item === 'string') return {
    nombre: item
  };
  if (item.payload && typeof item.payload === 'object') {
    return _objectSpread2(_objectSpread2(_objectSpread2({}, item.payload), item), {}, {
      payload: undefined
    });
  }
  return item;
};
const findCatalogMatch = function () {
  let catalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let targetName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  const normalizedTarget = normalizeKey(targetName);
  if (!normalizedTarget) return null;
  return catalog.find(entry => normalizeKey((entry === null || entry === void 0 ? void 0 : entry.nombre) || (entry === null || entry === void 0 ? void 0 : entry.name)) === normalizedTarget) || null;
};
const getEquippedArray = function () {
  let entity = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (Array.isArray(entity === null || entity === void 0 ? void 0 : entity.equippedItems)) {
    return entity.equippedItems.map(flattenItem).filter(Boolean);
  }
  if (entity !== null && entity !== void 0 && entity.equippedItems && typeof entity.equippedItems === 'object') {
    const items = [];
    Object.entries(entity.equippedItems).forEach(_ref6 => {
      let [slot, rawItem] = _ref6;
      if (!rawItem || slot === 'beltSlotCount') return;
      const item = flattenItem(rawItem);
      if (!item) return;
      let type = item.type;
      if (!type) {
        if (slot === 'body') type = 'armor';else if (slot === 'mainHand' || slot === 'offHand') type = 'weapon';else if (slot.startsWith('accessory_') || slot.startsWith('belt_')) {
          type = 'access';
        }
      }
      items.push(type ? _objectSpread2(_objectSpread2({}, item), {}, {
        type
      }) : item);
    });
    return items;
  }
  return [];
};
const buildArmorCandidateFromCatalog = function (entry) {
  let armorCatalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const item = flattenItem(entry);
  if (!item) return null;
  const name = getItemName(item);
  const fromCatalog = findCatalogMatch(armorCatalog, name);
  const merged = fromCatalog ? _objectSpread2(_objectSpread2({}, fromCatalog), item) : item;
  return _objectSpread2(_objectSpread2({}, merged), {}, {
    type: merged.type || 'armor'
  });
};
const resolveEquippedArmor = function (entity) {
  let {
    armaduras = []
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!entity) return null;
  const equippedItems = getEquippedArray(entity);
  const firstEquippedArmor = equippedItems.find(item => normalizeKey((item === null || item === void 0 ? void 0 : item.slot) || (item === null || item === void 0 ? void 0 : item.bodySlot) || '') === 'body' || isArmorItem(item, armaduras)) || equippedItems.find(item => isArmorItem(item, armaduras));
  if (firstEquippedArmor) {
    return buildArmorCandidateFromCatalog(firstEquippedArmor, armaduras);
  }
  if (Array.isArray(entity === null || entity === void 0 ? void 0 : entity.armaduras) && entity.armaduras.length > 0) {
    const firstArmor = entity.armaduras[0];
    return buildArmorCandidateFromCatalog(firstArmor, armaduras);
  }
  return null;
};
const getArmorStatSnapshot = function () {
  var _armorStat$current, _armorStat$actual, _ref7, _armorStat$max, _ref8, _armorStat$total;
  let stats = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const armorStat = (stats === null || stats === void 0 ? void 0 : stats.armadura) || {};
  const hasTokenShape = armorStat.current !== undefined || armorStat.max !== undefined;
  const current = hasTokenShape ? Number((_armorStat$current = armorStat.current) !== null && _armorStat$current !== void 0 ? _armorStat$current : 0) : Number((_armorStat$actual = armorStat.actual) !== null && _armorStat$actual !== void 0 ? _armorStat$actual : 0);
  const max = hasTokenShape ? Number((_ref7 = (_armorStat$max = armorStat.max) !== null && _armorStat$max !== void 0 ? _armorStat$max : armorStat.current) !== null && _ref7 !== void 0 ? _ref7 : 0) : Number((_ref8 = (_armorStat$total = armorStat.total) !== null && _armorStat$total !== void 0 ? _armorStat$total : armorStat.base) !== null && _ref8 !== void 0 ? _ref8 : 0);
  return {
    current: Number.isFinite(current) ? current : 0,
    max: Number.isFinite(max) ? max : 0,
    shape: hasTokenShape ? 'token' : 'sheet'
  };
};
const getArmorCdAttribute = function (entity) {
  let {
    armaduras = []
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const activeArmor = resolveEquippedArmor(entity, {
    armaduras
  });
  const armorTraits = armorSystem_getItemTraits(activeArmor);
  for (const trait of armorTraits) {
    const attributeId = resolveArmorCdTrait(trait);
    if (attributeId) return attributeId;
  }
  return 'vigor';
};
const buildArmorSourceKey = armor => {
  if (!armor) return null;
  const name = getItemName(armor);
  const id = (armor === null || armor === void 0 ? void 0 : armor.id) || normalizeKey(name);
  const blocks = getArmorBlocks(armor);
  return "armor:".concat(id, ":").concat(blocks);
};
const syncArmorState = function (entity) {
  var _entity$armorSync$sou, _entity$armorSync;
  let {
    armaduras = [],
    mode = 'sheet'
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!entity || typeof entity !== 'object') return entity;
  const activeArmor = resolveEquippedArmor(entity, {
    armaduras
  });
  const resolvedBlocks = activeArmor ? getArmorBlocks(activeArmor) : 0;
  if (activeArmor && resolvedBlocks <= 0) {
    return entity;
  }
  const nextSourceKey = buildArmorSourceKey(activeArmor);
  const prevSourceKey = (_entity$armorSync$sou = entity === null || entity === void 0 ? void 0 : (_entity$armorSync = entity.armorSync) === null || _entity$armorSync === void 0 ? void 0 : _entity$armorSync.sourceKey) !== null && _entity$armorSync$sou !== void 0 ? _entity$armorSync$sou : null;
  if (prevSourceKey === nextSourceKey && entity !== null && entity !== void 0 && entity.armorSync) {
    return entity;
  }
  const blocks = activeArmor ? resolvedBlocks : 0;
  const nextStats = _objectSpread({}, entity.stats || {});
  if (mode === 'token') {
    const currentArmor = nextStats.armadura || {};
    nextStats.armadura = _objectSpread(_objectSpread({}, currentArmor), {}, {
      current: blocks,
      max: blocks
    });
  } else {
    const currentArmor = nextStats.armadura || {};
    nextStats.armadura = _objectSpread(_objectSpread({}, currentArmor), {}, {
      base: blocks,
      buff: 0,
      total: blocks,
      actual: blocks
    });
  }
  return _objectSpread(_objectSpread({}, entity), {}, {
    stats: nextStats,
    armorSync: {
      sourceKey: nextSourceKey,
      armorName: getItemName(activeArmor),
      blocks
    }
  });
};
const getArmorProtection = function (defender, weapon) {
  let {
    armaduras = []
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const activeArmor = resolveEquippedArmor(defender, {
    armaduras
  });
  const weaponTraits = armorSystem_getItemTraits(weapon);
  const armorTraits = armorSystem_getItemTraits(activeArmor).filter(trait => !resolveArmorCdTrait(trait));
  const armorStat = getArmorStatSnapshot((defender === null || defender === void 0 ? void 0 : defender.stats) || {});
  const armorIsActive = !!activeArmor && armorStat.current > 0;
  if (!armorIsActive || weaponTraits.length === 0 || armorTraits.length === 0) {
    return {
      activeArmor,
      armorProtectionSource: getItemName(activeArmor),
      negatedTraits: [],
      armorCurrent: armorStat.current,
      armorActive: armorIsActive
    };
  }
  const armorTraitKeys = new Set(armorTraits.map(normalizeCombatTrait));
  const negatedTraits = weaponTraits.filter(trait => armorTraitKeys.has(normalizeCombatTrait(trait)));
  return {
    activeArmor,
    armorProtectionSource: getItemName(activeArmor),
    negatedTraits,
    armorCurrent: armorStat.current,
    armorActive: armorIsActive
  };
};
const applyNegatedTraitsToItem = function (item) {
  let negatedTraits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  if (!item || negatedTraits.length === 0) return item;
  const blockedTraitKeys = new Set(negatedTraits.map(normalizeCombatTrait));
  const filterTraits = value => {
    const traits = parseCombatTraits(value).filter(trait => !blockedTraitKeys.has(normalizeCombatTrait(trait)));
    if (Array.isArray(value)) return traits;
    if (typeof value === 'string') return traits.join(', ');
    return traits;
  };
  const nextItem = _objectSpread({}, item);
  ['rasgos', 'traits', 'trait', 'properties'].forEach(field => {
    if (nextItem[field] !== undefined) {
      nextItem[field] = filterTraits(nextItem[field]);
    }
  });
  return nextItem;
};
;// ./src/utils/cardBoard.js

const MASTER_HAND_SEAT_ID = '__master__';
const isCardItem = item => (item === null || item === void 0 ? void 0 : item.type) === 'card';
const isCardContainerItem = item => (item === null || item === void 0 ? void 0 : item.type) === 'cardContainer';
const isHandCardItem = item => isCardItem(item) && item.zone === 'hand';
const isStackedCardItem = item => isCardItem(item) && !!item.stackParentId;
const isCardInPrivateStack = function (item) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return isCardItem(item) && (item.hideStackContentsForPlayers === true || item.stackParentId && items.some(parent => parent.id === item.stackParentId && parent.hideStackContentsForPlayers === true));
};
const isContainedCardItem = item => isCardItem(item) && !!item.containerId;
const preservePendingHandTransferState = function (remoteItem, localItem) {
  let lockExpiresAt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  let now = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : Date.now();
  if (!isCardItem(remoteItem) || !isHandCardItem(localItem) || isHandCardItem(remoteItem) || now >= Number(lockExpiresAt || 0)) {
    return remoteItem;
  }
  return localItem;
};
const normalizeCardGroupName = function () {
  let card = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (card.name || card.nombre || 'Carta').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
const getCardStackIds = item => Array.isArray(item === null || item === void 0 ? void 0 : item.stackIds) ? [...new globalThis.Set(item.stackIds.filter(Boolean))] : [];
const isDiscardContainer = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!isCardContainerItem(item)) return false;
  const name = (item.name || '').toString().toLowerCase();
  return item.containerKind === 'discard' || name.includes('cementerio') || name.includes('descarte');
};
const getCardContainerItems = function (containerId) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return items.filter(item => isCardItem(item) && item.containerId === containerId).sort((a, b) => (Number(a.containerOrder) || 0) - (Number(b.containerOrder) || 0));
};
const isContainerCardsHiddenForPlayers = function () {
  let container = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return isCardContainerItem(container) && container.hideContainedCardsForPlayers === true;
};
const isCardHiddenByContainerForPlayer = function (item) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let isPlayerView = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  if (!isPlayerView || !isCardItem(item) || !item.containerId) return false;
  const parentContainer = items.find(candidate => (candidate === null || candidate === void 0 ? void 0 : candidate.id) === item.containerId && isCardContainerItem(candidate));
  return isContainerCardsHiddenForPlayers(parentContainer);
};
const isMasterLibraryDeck = deck => (deck === null || deck === void 0 ? void 0 : deck.isMasterLibrary) === true;
const normalizeHandSeatId = value => (value || '').toString().trim();
const getCardHandTokenId = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return item.handTokenId || item.ownerId;
};
const getCardHandSeatId = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (item.handSeatId) return normalizeHandSeatId(item.handSeatId);
  if (item.handSeatName) return normalizeHandSeatId(item.handSeatName);
  if (item.ownerName === 'Master') return MASTER_HAND_SEAT_ID;
  return normalizeHandSeatId(item.ownerName || item.ownerId);
};
const isLegacyTokenHandCard = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let tokenId = arguments.length > 1 ? arguments[1] : undefined;
  return !item.handSeatId && !item.handSeatName && getCardHandTokenId(item) === tokenId;
};
const sanitizeCardStacks = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const cardIds = new globalThis.Set(items.filter(isCardItem).map(item => item.id));
  const parentByChild = new globalThis.Map();
  const parentZoneByChild = new globalThis.Map();
  const cleanedParents = items.map(item => {
    if (!isCardItem(item)) return item;
    const cleanStackIds = getCardStackIds(item).filter(childId => {
      if (!cardIds.has(childId) || childId === item.id || parentByChild.has(childId)) return false;
      parentByChild.set(childId, item.id);
      parentZoneByChild.set(childId, item.zone || 'board');
      return true;
    });
    return cleanStackIds.length > 0 || Array.isArray(item.stackIds) ? _objectSpread(_objectSpread({}, item), {}, {
      stackIds: cleanStackIds
    }) : item;
  });
  return cleanedParents.map(item => {
    if (!isCardItem(item)) return item;
    const parentId = parentByChild.get(item.id);
    if (parentId) {
      return _objectSpread(_objectSpread({}, item), {}, {
        zone: parentZoneByChild.get(item.id) || item.zone || 'board',
        stackParentId: parentId,
        stackIds: []
      });
    }
    return item.stackParentId ? _objectSpread(_objectSpread({}, item), {}, {
      stackParentId: null
    }) : item;
  });
};
const getVisibleHandCards = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let predicate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => true;
  return items.filter(item => isHandCardItem(item) && predicate(item)).sort((a, b) => (Number(a.handOrder) || 0) - (Number(b.handOrder) || 0));
};
const reorderCardIds = function () {
  let cardIds = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let movedCardId = arguments.length > 1 ? arguments[1] : undefined;
  let targetIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  const uniqueIds = [...new globalThis.Set(cardIds.filter(Boolean))];
  const sourceIndex = uniqueIds.indexOf(movedCardId);
  if (sourceIndex === -1) return uniqueIds;
  const remainingIds = uniqueIds.filter(id => id !== movedCardId);
  const numericTarget = Number(targetIndex);
  const safeTarget = Number.isFinite(numericTarget) ? Math.trunc(numericTarget) : sourceIndex;
  const insertionIndex = Math.max(0, Math.min(remainingIds.length, safeTarget));
  remainingIds.splice(insertionIndex, 0, movedCardId);
  return remainingIds;
};
const reorderCardItems = function () {
  let cards = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let movedCardId = arguments.length > 1 ? arguments[1] : undefined;
  let targetIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  const cardById = new globalThis.Map(cards.filter(card => card === null || card === void 0 ? void 0 : card.id).map(card => [card.id, card]));
  return reorderCardIds(cards.map(card => card === null || card === void 0 ? void 0 : card.id), movedCardId, targetIndex).map(id => cardById.get(id)).filter(Boolean);
};
const reorderHandCards = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let handCardIds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let movedCardId = arguments.length > 2 ? arguments[2] : undefined;
  let targetIndex = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  const liveHandIds = [...new globalThis.Set(handCardIds.filter(Boolean))].filter(id => items.some(item => item.id === id && isHandCardItem(item)));
  const orderedCardIds = reorderCardIds(liveHandIds, movedCardId, targetIndex);
  if (!liveHandIds.includes(movedCardId)) {
    return {
      items,
      orderedCardIds: liveHandIds,
      changedIds: [],
      moved: false
    };
  }
  const moved = orderedCardIds.some((id, index) => id !== liveHandIds[index]);
  if (!moved) {
    return {
      items,
      orderedCardIds,
      changedIds: [],
      moved: false
    };
  }
  const handOrderById = new globalThis.Map(orderedCardIds.map((id, index) => [id, index + 1]));
  const changedIds = [];
  const nextItems = items.map(item => {
    const nextHandOrder = handOrderById.get(item.id);
    if (nextHandOrder === undefined || Number(item.handOrder) === nextHandOrder) return item;
    changedIds.push(item.id);
    return _objectSpread(_objectSpread({}, item), {}, {
      handOrder: nextHandOrder
    });
  });
  return {
    items: nextItems,
    orderedCardIds,
    changedIds,
    moved: true
  };
};
const moveBoardCardPileToHand = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let cardId = arguments.length > 1 ? arguments[1] : undefined;
  let handOwner = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let orderSeed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : Date.now();
  const card = items.find(item => item.id === cardId);
  if (!isCardItem(card)) return {
    items,
    changedIds: [],
    moved: false
  };
  const movingIds = [card.id, ...getCardStackIds(card)].filter(Boolean);
  const movingIdSet = new globalThis.Set(movingIds);
  const changedIdSet = new globalThis.Set(movingIds);
  const orderById = new globalThis.Map(movingIds.map((id, index) => [id, orderSeed + index]));
  const nextItems = sanitizeCardStacks(items.map(item => {
    if (movingIdSet.has(item.id) && isCardItem(item)) {
      return _objectSpread(_objectSpread({}, item), {}, {
        x: 0,
        y: 0,
        zone: 'hand',
        containerId: null,
        containerOrder: null,
        stackParentId: null,
        stackIds: [],
        ownerId: handOwner.ownerId,
        ownerName: handOwner.ownerName,
        handTokenId: handOwner.handTokenId || handOwner.ownerId,
        handTokenName: handOwner.handTokenName || handOwner.ownerName,
        handSeatId: handOwner.handSeatId,
        handSeatName: handOwner.handSeatName,
        handOrder: orderById.get(item.id)
      });
    }
    if (Array.isArray(item.stackIds)) {
      const nextStackIds = item.stackIds.filter(id => !movingIdSet.has(id));
      if (nextStackIds.length !== item.stackIds.length) {
        changedIdSet.add(item.id);
        return _objectSpread(_objectSpread({}, item), {}, {
          stackIds: nextStackIds
        });
      }
    }
    return item;
  }));
  return {
    items: nextItems,
    changedIds: [...changedIdSet],
    moved: true
  };
};
const moveCardIntoContainer = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let sourceId = arguments.length > 1 ? arguments[1] : undefined;
  let containerId = arguments.length > 2 ? arguments[2] : undefined;
  let orderSeed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : Date.now();
  const source = items.find(item => item.id === sourceId);
  const container = items.find(item => item.id === containerId);
  if (!isCardItem(source) || !isCardContainerItem(container)) return items;
  const movingIds = new globalThis.Set([source.id, ...getCardStackIds(source)].filter(Boolean));
  const currentMaxOrder = items.reduce((maxOrder, item) => item.containerId === containerId ? Math.max(maxOrder, Number(item.containerOrder) || 0) : maxOrder, orderSeed);
  let orderOffset = 0;
  const nextItems = items.map(item => {
    if (movingIds.has(item.id) && isCardItem(item)) {
      orderOffset += 1;
      const isSource = item.id === sourceId;
      return _objectSpread(_objectSpread({}, item), {}, {
        zone: 'board',
        containerId,
        containerOrder: currentMaxOrder + orderOffset,
        stackParentId: isSource ? null : sourceId,
        stackIds: isSource ? source.stackIds : [],
        x: item.x,
        y: item.y,
        rotation: item.rotation || 0
      });
    }
    if (Array.isArray(item.stackIds)) {
      return _objectSpread(_objectSpread({}, item), {}, {
        stackIds: item.stackIds.filter(id => !movingIds.has(id))
      });
    }
    return item;
  });
  return sanitizeCardStacks(nextItems);
};
const detachCardFromContainer = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let sourceId = arguments.length > 1 ? arguments[1] : undefined;
  const source = items.find(item => item.id === sourceId);
  if (!isCardItem(source)) return items;
  const movingIds = new globalThis.Set([source.id, ...getCardStackIds(source)].filter(Boolean));
  return items.map(item => movingIds.has(item.id) && isCardItem(item) ? _objectSpread(_objectSpread({}, item), {}, {
    containerId: null,
    containerOrder: null
  }) : item);
};
const stackCardOnTarget = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let sourceId = arguments.length > 1 ? arguments[1] : undefined;
  let targetId = arguments.length > 2 ? arguments[2] : undefined;
  const source = items.find(item => item.id === sourceId);
  const target = items.find(item => item.id === targetId);
  if (!isCardItem(source) || !isCardItem(target) || source.id === target.id) return items;
  const nextContainerId = target.containerId || source.containerId || null;
  const sourceStackIds = getCardStackIds(source);
  const targetStackIds = getCardStackIds(target);
  const sourcePileIds = [source.id, ...sourceStackIds].filter(Boolean);
  const targetPileIds = [target.id, ...targetStackIds].filter(Boolean);
  if (sourcePileIds.includes(target.id) || targetPileIds.includes(source.id)) return items;
  const nextSourceStackIds = [...targetStackIds, target.id, ...sourceStackIds].filter(Boolean);
  const stackedIds = new globalThis.Set(nextSourceStackIds);
  const privateStack = target.hideStackContentsForPlayers === true || source.hideStackContentsForPlayers === true;
  const stackKey = target.stackKey || source.stackKey || null;
  const nextItems = items.map(item => {
    if (item.id === source.id) {
      return _objectSpread(_objectSpread({}, item), {}, {
        zone: 'board',
        containerId: nextContainerId,
        stackParentId: null,
        stackIds: nextSourceStackIds,
        stackKey,
        boardDraw: null,
        hideStackContentsForPlayers: privateStack,
        faceDown: privateStack ? true : item.faceDown === true
      });
    }
    if (stackedIds.has(item.id)) {
      return _objectSpread(_objectSpread({}, item), {}, {
        zone: 'board',
        containerId: nextContainerId,
        stackParentId: source.id,
        stackIds: [],
        stackKey: null,
        boardDraw: null,
        hideStackContentsForPlayers: false,
        faceDown: privateStack ? true : item.faceDown === true,
        x: source.x,
        y: source.y,
        rotation: source.rotation || 0
      });
    }
    if (Array.isArray(item.stackIds)) {
      return _objectSpread(_objectSpread({}, item), {}, {
        stackIds: item.stackIds.filter(id => !sourcePileIds.includes(id) && !targetPileIds.includes(id))
      });
    }
    return item;
  });
  return sanitizeCardStacks(nextItems);
};
const takeTopCardFromStack = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let stackParentId = arguments.length > 1 ? arguments[1] : undefined;
  const parent = items.find(item => item.id === stackParentId);
  const stackIds = getCardStackIds(parent);
  const releasedCardId = stackIds[stackIds.length - 1] || null;
  if (!isCardItem(parent) || !releasedCardId) {
    return {
      items,
      releasedCardId: null,
      changedIds: []
    };
  }
  const offsetX = Math.min(52, Math.max(24, (Number(parent.width) || 120) * 0.22));
  const offsetY = Math.min(38, Math.max(18, (Number(parent.height) || 168) * 0.12));
  const nextStackIds = stackIds.slice(0, -1);
  const nextItems = sanitizeCardStacks(items.map(item => {
    if (item.id === parent.id) return _objectSpread(_objectSpread({}, item), {}, {
      stackIds: nextStackIds
    });
    if (item.id !== releasedCardId) return item;
    return _objectSpread(_objectSpread({}, item), {}, {
      zone: 'board',
      containerId: parent.containerId || null,
      containerOrder: parent.containerOrder || null,
      stackParentId: null,
      stackIds: [],
      x: parent.x + offsetX,
      y: parent.y + offsetY,
      rotation: parent.rotation || 0
    });
  }));
  return {
    items: nextItems,
    releasedCardId,
    changedIds: [stackParentId, releasedCardId]
  };
};
const spreadCardStack = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let stackParentId = arguments.length > 1 ? arguments[1] : undefined;
  const parent = items.find(item => item.id === stackParentId);
  const releasedCardIds = getCardStackIds(parent);
  if (!isCardItem(parent) || releasedCardIds.length === 0) {
    return {
      items,
      releasedCardIds: [],
      changedIds: []
    };
  }
  const gapX = Math.min(44, Math.max(26, (Number(parent.width) || 120) * 0.2));
  const gapY = Math.min(28, Math.max(14, (Number(parent.height) || 168) * 0.09));
  const nextItems = sanitizeCardStacks(items.map(item => {
    if (item.id === parent.id) return _objectSpread(_objectSpread({}, item), {}, {
      stackIds: []
    });
    const stackIndex = releasedCardIds.indexOf(item.id);
    if (stackIndex === -1) return item;
    const spreadIndex = stackIndex + 1;
    return _objectSpread(_objectSpread({}, item), {}, {
      zone: 'board',
      containerId: parent.containerId || null,
      containerOrder: parent.containerOrder || null,
      stackParentId: null,
      stackIds: [],
      x: parent.x + gapX * spreadIndex,
      y: parent.y + gapY * spreadIndex,
      rotation: parent.rotation || 0
    });
  }));
  return {
    items: nextItems,
    releasedCardIds,
    changedIds: [stackParentId, ...releasedCardIds]
  };
};
const takeCardFromStack = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let stackParentId = arguments.length > 1 ? arguments[1] : undefined;
  let cardId = arguments.length > 2 ? arguments[2] : undefined;
  const parent = items.find(item => item.id === stackParentId);
  const stackIds = getCardStackIds(parent);
  const stackIndex = stackIds.indexOf(cardId);
  if (!isCardItem(parent) || stackIndex === -1) {
    return {
      items,
      releasedCardId: null,
      changedIds: []
    };
  }
  const offsetX = Math.min(68, Math.max(30, (Number(parent.width) || 120) * 0.28));
  const offsetY = Math.min(48, Math.max(18, (Number(parent.height) || 168) * 0.12));
  const nextStackIds = stackIds.filter(id => id !== cardId);
  const nextItems = sanitizeCardStacks(items.map(item => {
    if (item.id === parent.id) return _objectSpread(_objectSpread({}, item), {}, {
      stackIds: nextStackIds
    });
    if (item.id !== cardId) return item;
    const direction = stackIndex % 2 === 0 ? -1 : 1;
    return _objectSpread(_objectSpread({}, item), {}, {
      zone: 'board',
      containerId: parent.containerId || null,
      containerOrder: parent.containerOrder || null,
      stackParentId: null,
      stackIds: [],
      x: parent.x + offsetX * direction,
      y: parent.y + offsetY,
      rotation: parent.rotation || 0
    });
  }));
  return {
    items: nextItems,
    releasedCardId: cardId,
    changedIds: [stackParentId, cardId]
  };
};
const snapCardRotationAngle = function (angle) {
  let threshold = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5;
  if (!Number.isFinite(angle)) return angle;
  const normalized = (angle % 360 + 360) % 360;
  const nearestRightAngle = Math.round(normalized / 90) * 90;
  const wrappedNearest = nearestRightAngle === 360 ? 0 : nearestRightAngle;
  const distance = Math.min(Math.abs(normalized - wrappedNearest), Math.abs(normalized - wrappedNearest + 360), Math.abs(normalized - wrappedNearest - 360));
  if (distance > threshold) return angle;
  const turns = Math.floor(angle / 360);
  return turns * 360 + nearestRightAngle;
};
;// ./src/features/tactical-shared/legacyCombatRules.jsx










// Frozen legacy rules. New Roguelite combat rules belong exclusively in features/canvas.

const fixMojibakeText = function () {
  let value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  if (value === null || value === undefined) return '';
  let current = String(value);
  if (!/[\u00c3\u00c2\u00e2]/.test(current)) return current;
  for (let i = 0; i < 6; i += 1) {
    try {
      const bytes = Uint8Array.from([...current].map(char => char.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', {
        fatal: true
      }).decode(bytes);
      if (decoded === current) break;
      current = decoded;
    } catch (_unused) {
      break;
    }
  }
  return current;
};
const formatCombatTraitLabel = function () {
  let trait = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  const cleanTrait = fixMojibakeText(trait).trim();
  const normalized = cleanTrait.toLowerCase();
  if (normalized === 'derribado' || normalized === 'derribar' || normalized === 'derribo') return 'Derribo';
  if (normalized === 'conmocionante') return 'Conmocionante';
  if (normalized === 'fluida') return 'Fluida';
  if (normalized === 'sangrado') return 'Sangrado';
  if (normalized === 'ralentizado' || normalized === 'ralentizar') return 'Ralentizado';
  if (normalized === 'penetrante' || normalized === 'perforante') return 'Perforante';
  if (normalized === 'empuje' || normalized === 'empujar') return 'Empuje';
  if (normalized === 'elusion' || normalized === 'elusión') return 'Elusión';
  if (normalized === 'balistico' || normalized === 'balístico' || normalized === 'balistica' || normalized === 'balística') return 'Balístico';
  if (normalized === 'distancia') return 'Distancia';
  if (normalized === 'bloqueo' || normalized === 'bloquear') return 'Bloqueo';
  if (normalized === 'guardia') return 'Guardia';
  if (normalized === 'sin guardia' || normalized === 'singuardia' || normalized === 'sin_guardia') return 'Sin guardia';
  return cleanTrait;
};
const COMBAT_RANGE_MAP = {
  toque: 0,
  cercano: 1,
  intermedio: 2,
  lejano: 3,
  extremo: 999
};
const getCombatRangeData = item => {
  var _ref, _ref2, _ref3, _ref4, _ref5, _ref6, _item$alc, _item$payload, _item$payload2, _item$payload3;
  const rawRange = (_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_ref6 = (_item$alc = item === null || item === void 0 ? void 0 : item.alc) !== null && _item$alc !== void 0 ? _item$alc : item === null || item === void 0 ? void 0 : item.alcance) !== null && _ref6 !== void 0 ? _ref6 : item === null || item === void 0 ? void 0 : item.range) !== null && _ref5 !== void 0 ? _ref5 : item === null || item === void 0 ? void 0 : item.Alcance) !== null && _ref4 !== void 0 ? _ref4 : item === null || item === void 0 ? void 0 : item.Range) !== null && _ref3 !== void 0 ? _ref3 : item === null || item === void 0 ? void 0 : (_item$payload = item.payload) === null || _item$payload === void 0 ? void 0 : _item$payload.range) !== null && _ref2 !== void 0 ? _ref2 : item === null || item === void 0 ? void 0 : (_item$payload2 = item.payload) === null || _item$payload2 === void 0 ? void 0 : _item$payload2.alcance) !== null && _ref !== void 0 ? _ref : item === null || item === void 0 ? void 0 : (_item$payload3 = item.payload) === null || _item$payload3 === void 0 ? void 0 : _item$payload3.alc;
  if (rawRange === undefined || rawRange === null || rawRange === '') {
    return {
      value: COMBAT_RANGE_MAP.toque,
      label: 'Toque'
    };
  }
  const label = rawRange.toString().trim();
  const normalized = label.toLowerCase();
  if (normalized.includes('toque')) return {
    value: COMBAT_RANGE_MAP.toque,
    label
  };
  if (normalized.includes('cercano')) return {
    value: COMBAT_RANGE_MAP.cercano,
    label
  };
  if (normalized.includes('intermedio')) return {
    value: COMBAT_RANGE_MAP.intermedio,
    label
  };
  if (normalized.includes('lejano')) return {
    value: COMBAT_RANGE_MAP.lejano,
    label
  };
  if (normalized.includes('extremo')) return {
    value: COMBAT_RANGE_MAP.extremo,
    label
  };
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) {
    return {
      value: parseInt(digitMatch[0], 10),
      label
    };
  }
  return {
    value: COMBAT_RANGE_MAP.toque,
    label
  };
};
const isBoardMarkerItem = item => (item === null || item === void 0 ? void 0 : item.type) === 'boardMarker';
const isBoardDieItem = item => (item === null || item === void 0 ? void 0 : item.type) === 'boardDie';
const legacyCombatRules_isCombatTokenItem = item => Boolean(item) && item.type !== 'light' && item.type !== 'wall' && item.type !== 'geometry' && item.type !== 'scenePickup' && item.sceneItemKind !== 'canvasLoot' && !isCardItem(item) && !isCardContainerItem(item) && !isBoardMarkerItem(item) && !isBoardDieItem(item);
const isMobileTacticalMoveToken = item => legacyCombatRules_isCombatTokenItem(item) && !!(item.stats || item.linkedCharacterId || Array.isArray(item.equippedItems) && item.equippedItems.length > 0 || Array.isArray(item.inventory) && item.inventory.length > 0);
const getCombatSpeedTokens = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return (items || []).filter(item => legacyCombatRules_isCombatTokenItem(item) && (item.isCircular || item.stats));
};
const isMasterControlledCombatToken = token => {
  const controlledBy = Array.isArray(token === null || token === void 0 ? void 0 : token.controlledBy) ? token.controlledBy.filter(Boolean) : [];
  return controlledBy.length === 0 || controlledBy.includes('master') || controlledBy.includes('Master');
};
const getCombatTokenSpeed = token => Math.max(0, Number(token === null || token === void 0 ? void 0 : token.velocidad) || 0);
const getActiveCombatTurnInfo = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const combatTokens = getCombatSpeedTokens(items);
  if (combatTokens.length === 0) {
    return {
      activeSpeed: 0,
      hasMasterAtActiveSpeed: false
    };
  }
  const activeSpeed = Math.min(...combatTokens.map(getCombatTokenSpeed));
  const hasMasterAtActiveSpeed = combatTokens.some(token => getCombatTokenSpeed(token) === activeSpeed && isMasterControlledCombatToken(token));
  return {
    activeSpeed,
    hasMasterAtActiveSpeed
  };
};
const canCombatTokenActNow = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let scenarioOrCombat = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  if (!token) return false;

  // 1. Soporte para el sistema de iniciativa por rondas y bloques (Canvas Combat)
  const combatState = (scenarioOrCombat === null || scenarioOrCombat === void 0 ? void 0 : scenarioOrCombat.canvasCombat) || scenarioOrCombat;
  if (combatState && combatState.status === 'active') {
    var _combatState$particip, _participant$defensiv;
    const participant = (_combatState$particip = combatState.participants) === null || _combatState$particip === void 0 ? void 0 : _combatState$particip[token.id];
    if (Number(participant === null || participant === void 0 ? void 0 : (_participant$defensiv = participant.defensiveReposition) === null || _participant$defensiv === void 0 ? void 0 : _participant$defensiv.remaining) > 0) return true;
    if (combatState.roundPhase === 'rolling') {
      return true; // En fase de preparación todos pueden interactuar y tirar dados
    }
    if (combatState.roundPhase === 'turns') {
      var _combatState$blocks;
      const activeBlock = (_combatState$blocks = combatState.blocks) === null || _combatState$blocks === void 0 ? void 0 : _combatState$blocks[combatState.activeBlockIndex];
      if (!activeBlock) return false;
      const memberIds = Array.isArray(activeBlock.memberIds) ? activeBlock.memberIds : Array.isArray(activeBlock.tokenIds) ? activeBlock.tokenIds : [];
      const actedIds = Array.isArray(activeBlock.actedIds) ? activeBlock.actedIds : Array.isArray(activeBlock.completedTokenIds) ? activeBlock.completedTokenIds : [];
      const isParticipantInBlock = memberIds.includes(token.id);
      const hasActed = actedIds.includes(token.id);
      return isParticipantInBlock && !hasActed;
    }
    return true;
  }

  // 2. Sistema clásico por velocidad (cuando se usa modo combate clásico sin canvasCombat)
  const {
    activeSpeed,
    hasMasterAtActiveSpeed
  } = getActiveCombatTurnInfo(items);
  if (getCombatTokenSpeed(token) !== activeSpeed) return false;
  return !hasMasterAtActiveSpeed || isMasterControlledCombatToken(token);
};
const sanitizeForFirestore = value => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(_ref7 => {
      let [key, entryValue] = _ref7;
      return [key, sanitizeForFirestore(entryValue)];
    }));
  }
  return value;
};
const getItemOverlapRatio = function () {
  let a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const left = Math.max(Number(a.x) || 0, Number(b.x) || 0);
  const top = Math.max(Number(a.y) || 0, Number(b.y) || 0);
  const right = Math.min((Number(a.x) || 0) + (Number(a.width) || 0), (Number(b.x) || 0) + (Number(b.width) || 0));
  const bottom = Math.min((Number(a.y) || 0) + (Number(a.height) || 0), (Number(b.y) || 0) + (Number(b.height) || 0));
  const overlapWidth = Math.max(0, right - left);
  const overlapHeight = Math.max(0, bottom - top);
  const overlapArea = overlapWidth * overlapHeight;
  const minArea = Math.max(1, Math.min((Number(a.width) || 0) * (Number(a.height) || 0), (Number(b.width) || 0) * (Number(b.height) || 0)));
  return overlapArea / minArea;
};
const getCardCenter = item => ({
  x: (Number(item === null || item === void 0 ? void 0 : item.x) || 0) + (Number(item === null || item === void 0 ? void 0 : item.width) || 0) / 2,
  y: (Number(item === null || item === void 0 ? void 0 : item.y) || 0) + (Number(item === null || item === void 0 ? void 0 : item.height) || 0) / 2
});
const isPointInsideExpandedItem = function (point, item) {
  let expandRatio = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.18;
  if (!point || !item) return false;
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const expandX = width * expandRatio;
  const expandY = height * expandRatio;
  return point.x >= item.x - expandX && point.x <= item.x + width + expandX && point.y >= item.y - expandY && point.y <= item.y + height + expandY;
};
const legacyCombatRules_normalizeCombatSideKey = function () {
  let value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return value.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};
const getTokenCombatSideKeys = token => {
  const sideKeys = new Set();
  const teamId = legacyCombatRules_normalizeCombatSideKey((token === null || token === void 0 ? void 0 : token.teamId) || '');
  if (teamId) {
    sideKeys.add("team:".concat(teamId));
  }
  const controlledBy = Array.isArray(token === null || token === void 0 ? void 0 : token.controlledBy) ? token.controlledBy : [];
  controlledBy.map(entry => legacyCombatRules_normalizeCombatSideKey(entry)).filter(Boolean).forEach(entry => {
    sideKeys.add("control:".concat(entry));
  });
  if (!teamId && controlledBy.length === 0) {
    sideKeys.add('control:master');
  }
  return sideKeys;
};
const legacyCombatRules_areTokensAllied = (tokenA, tokenB) => {
  if (!legacyCombatRules_isCombatTokenItem(tokenA) || !legacyCombatRules_isCombatTokenItem(tokenB)) return false;
  const teamIdA = legacyCombatRules_normalizeCombatSideKey((tokenA === null || tokenA === void 0 ? void 0 : tokenA.teamId) || '');
  const teamIdB = legacyCombatRules_normalizeCombatSideKey((tokenB === null || tokenB === void 0 ? void 0 : tokenB.teamId) || '');
  if (teamIdA || teamIdB) {
    return !!teamIdA && teamIdA === teamIdB;
  }
  const sideKeysA = getTokenCombatSideKeys(tokenA);
  const sideKeysB = getTokenCombatSideKeys(tokenB);
  for (const key of sideKeysA) {
    if (sideKeysB.has(key)) return true;
  }
  return false;
};
const getDefaultTokenDimensions = function () {
  let config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  return {
    width: roundGridValue(cellW * DEFAULT_TOKEN_CELL_SCALE),
    height: roundGridValue(cellH * DEFAULT_TOKEN_CELL_SCALE)
  };
};
const canTokenShareCombatCell = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const cellW = Number(config.cellWidth) || grid_DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || grid_DEFAULT_GRID_CONFIG.cellHeight;
  const width = Number(token === null || token === void 0 ? void 0 : token.width) || cellW;
  const height = Number(token === null || token === void 0 ? void 0 : token.height) || cellH;
  return width <= cellW * 0.55 && height <= cellH * 0.55;
};
const isSmallCombatToken = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!legacyCombatRules_isCombatTokenItem(token)) return false;
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const width = Number(token === null || token === void 0 ? void 0 : token.width) || cellW;
  const height = Number(token === null || token === void 0 ? void 0 : token.height) || cellH;
  return width < cellW * DEFAULT_TOKEN_CELL_SCALE && height < cellH * DEFAULT_TOKEN_CELL_SCALE;
};
const isLockedCombatToken = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!legacyCombatRules_isCombatTokenItem(token)) return false;
  return !canTokenShareCombatCell(token, config);
};
const getTokenDistanceInCells = function (t1, t2) {
  let gridConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!t1 || !t2) return 0;
  const cellW = gridConfig.cellWidth || 50;
  const cellH = gridConfig.cellHeight || 50;
  const gridRect = spatial_getGridWorldRect(gridConfig);
  const t1x = Math.round(((t1.x || 0) - gridRect.x) / cellW);
  const t1y = Math.round(((t1.y || 0) - gridRect.y) / cellH);
  const t1w = Math.max(1, Math.round((t1.width || cellW) / cellW));
  const t1h = Math.max(1, Math.round((t1.height || cellH) / cellH));
  const t2x = Math.round(((t2.x || 0) - gridRect.x) / cellW);
  const t2y = Math.round(((t2.y || 0) - gridRect.y) / cellH);
  const t2w = Math.max(1, Math.round((t2.width || cellW) / cellW));
  const t2h = Math.max(1, Math.round((t2.height || cellH) / cellH));
  const distX = Math.max(0, t2x - (t1x + t1w - 1), t1x - (t2x + t2w - 1));
  const distY = Math.max(0, t2y - (t1y + t1h - 1), t1y - (t2y + t2h - 1));
  return Math.max(distX, distY);
};
const canUseTouchAgainstAdjacentLockedTarget = function (attacker, target) {
  let gridConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!attacker || !target) return false;
  const actualDistance = getTokenDistanceInCells(attacker, target, gridConfig);
  if (actualDistance !== 1) return false;
  return isLockedCombatToken(attacker, gridConfig) || isLockedCombatToken(target, gridConfig);
};
const isWeaponWithinCombatRange = function (weapon, attacker, target) {
  let gridConfig = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  let precomputedDistance = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
  if (!weapon || !attacker || !target) return false;
  const rangeData = getCombatRangeData(weapon);
  const actualDistance = Number.isFinite(Number(precomputedDistance)) ? Number(precomputedDistance) : getTokenDistanceInCells(attacker, target, gridConfig);
  if (rangeData.value >= actualDistance) return true;
  return rangeData.value === COMBAT_RANGE_MAP.toque && actualDistance === 1 && canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig);
};
const getTokenProneStatusId = token => {
  const statuses = Array.isArray(token === null || token === void 0 ? void 0 : token.status) ? token.status : [];
  return PRONE_STATUS_IDS.find(statusId => statuses.includes(statusId)) || null;
};
const getTokenProneStatusMeta = token => {
  const proneStatusId = getTokenProneStatusId(token);
  if (!proneStatusId) return null;
  return _objectSpread({
    id: proneStatusId
  }, DEFAULT_STATUS_EFFECTS[proneStatusId] || DEFAULT_STATUS_EFFECTS.derribado);
};
const isTokenDerribado = token => !!getTokenProneStatusId(token);
const getStandUpSpeedCost = token => {
  const proneStatusId = getTokenProneStatusId(token);
  return proneStatusId === 'conmocionado' ? 2 : 1;
};
const getCombatWeaponName = weapon => String((weapon === null || weapon === void 0 ? void 0 : weapon.nombre) || (weapon === null || weapon === void 0 ? void 0 : weapon.name) || '').trim().toLowerCase();
const normalizeFluidaState = state => {
  if (!state || !state.targetId) return null;
  const updatedAt = Number(state.updatedAt);
  return {
    targetId: state.targetId,
    weaponName: state.weaponName || '',
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    source: state.source || 'attack'
  };
};
const getTokenFluidaState = token => normalizeFluidaState(token === null || token === void 0 ? void 0 : token.fluidaState);
const createFluidaState = function (targetId, weapon) {
  let source = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'attack';
  if (!targetId) return null;
  return {
    targetId,
    weaponName: getCombatWeaponName(weapon),
    updatedAt: Date.now(),
    source
  };
};
const getQueuedFluidaState = (token, pendingState) => {
  let nextState = getTokenFluidaState(token);
  if (!pendingState || pendingState.tokenId !== (token === null || token === void 0 ? void 0 : token.id)) {
    return nextState;
  }
  (pendingState.actions || []).forEach(action => {
    if (action.actionId !== 'attack') {
      nextState = null;
      return;
    }
    if (!hasNativeCombatTrait(action.weapon, 'fluida') || !action.targetId) {
      nextState = null;
      return;
    }
    nextState = createFluidaState(action.targetId, action.weapon, 'attack');
  });
  return nextState;
};
const getAttackSpeedCostMeta = _ref8 => {
  let {
    attackerToken,
    targetId,
    weapon,
    pendingState
  } = _ref8;
  const baseCost = Math.max(1, weapon ? getSpeedConsumption(weapon) : 2);
  const hasNativeFluidaTrait = hasNativeCombatTrait(weapon, 'fluida');
  const hasManualFluidaTrait = !hasNativeFluidaTrait && hasManualCombatTrait(weapon, 'fluida');
  const queuedFluidaState = getQueuedFluidaState(attackerToken, pendingState);
  const weaponName = getCombatWeaponName(weapon);
  const automaticFluidaDiscountApplied = hasNativeFluidaTrait && (queuedFluidaState === null || queuedFluidaState === void 0 ? void 0 : queuedFluidaState.targetId) && queuedFluidaState.targetId === targetId && (queuedFluidaState === null || queuedFluidaState === void 0 ? void 0 : queuedFluidaState.weaponName) && queuedFluidaState.weaponName === weaponName && baseCost > 1;
  const manualFluidaDiscountApplied = hasManualFluidaTrait && baseCost > 1;
  const fluidaDiscountApplied = automaticFluidaDiscountApplied || manualFluidaDiscountApplied;
  return {
    baseCost,
    cost: fluidaDiscountApplied ? Math.max(1, baseCost - 1) : baseCost,
    hasFluidaTrait: hasNativeFluidaTrait || hasManualFluidaTrait,
    hasNativeFluidaTrait,
    hasManualFluidaTrait,
    fluidaDiscountApplied,
    fluidaDiscountMode: manualFluidaDiscountApplied ? 'manual' : automaticFluidaDiscountApplied ? 'native' : null
  };
};
const getReactionBudgetForEvent = event => {
  var _event$fluidaMeta;
  const explicitBudget = Number(event === null || event === void 0 ? void 0 : event.reactionBudget);
  if (Number.isFinite(explicitBudget) && explicitBudget >= 0) {
    return Math.max(0, Math.round(explicitBudget));
  }
  const fluidaBaseCost = Number(event === null || event === void 0 ? void 0 : (_event$fluidaMeta = event.fluidaMeta) === null || _event$fluidaMeta === void 0 ? void 0 : _event$fluidaMeta.baseCost);
  if (Number.isFinite(fluidaBaseCost) && fluidaBaseCost > 0) {
    var _event$fluidaMeta2;
    return Math.max(1, Math.round(event !== null && event !== void 0 && (_event$fluidaMeta2 = event.fluidaMeta) !== null && _event$fluidaMeta2 !== void 0 && _event$fluidaMeta2.discountApplied ? fluidaBaseCost - 1 : fluidaBaseCost));
  }
  return Math.max(1, getSpeedConsumption(event === null || event === void 0 ? void 0 : event.weapon));
};
const getReactionSpeedSpentByEvent = event => {
  var _event$reactionData;
  if (!event || event.status === 'esperando_reaccion') return 0;
  const explicitCost = Number((_event$reactionData = event.reactionData) === null || _event$reactionData === void 0 ? void 0 : _event$reactionData.yellowCost);
  if (Number.isFinite(explicitCost) && explicitCost > 0) {
    return Math.max(0, Math.round(explicitCost));
  }
  if (event.reactionType === 'parar') {
    return buildLegacyParrySteps(event.reactionData).reduce((sum, step) => sum + Math.max(0, Number(step === null || step === void 0 ? void 0 : step.yellowCost) || 0), 0);
  }
  if (event.reactionType === 'evadir') {
    var _event$reactionData2;
    return Array.isArray((_event$reactionData2 = event.reactionData) === null || _event$reactionData2 === void 0 ? void 0 : _event$reactionData2.evadedDiceIds) ? event.reactionData.evadedDiceIds.length : 0;
  }
  return 0;
};
const buildLegacyParrySteps = reactionData => {
  if (!reactionData) return [];
  if (Array.isArray(reactionData.parrySteps) && reactionData.parrySteps.length > 0) {
    return reactionData.parrySteps;
  }
  if (!reactionData.weapon) return [];
  const yellowCost = Math.max(1, Number(reactionData.yellowCost) || Number(reactionData.baseYellowCost) || getSpeedConsumption(reactionData.weapon));
  return [{
    id: 'legacy-parry-step',
    weapon: reactionData.weapon,
    yellowCost,
    baseYellowCost: Math.max(1, Number(reactionData.baseYellowCost) || yellowCost),
    fluidaDiscountApplied: !!reactionData.fluidaDiscountApplied
  }];
};
const extractCombatRollDice = function (rollResult) {
  let idPrefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'roll';
  const dice = [];
  ((rollResult === null || rollResult === void 0 ? void 0 : rollResult.details) || []).forEach((detail, dIdx) => {
    if (detail.type === 'dice') {
      var _detail$formula;
      const match = (_detail$formula = detail.formula) === null || _detail$formula === void 0 ? void 0 : _detail$formula.match(/d(\d+)/i);
      const faces = match ? parseInt(match[1], 10) : 20;
      detail.rolls.forEach((r, rIdx) => {
        dice.push({
          value: typeof r === 'object' ? r.value : r,
          critical: typeof r === 'object' ? r.critical : false,
          matchedAttr: detail.matchedAttr || null,
          id: "".concat(idPrefix, "-").concat(dIdx, "-").concat(rIdx),
          faces
        });
      });
    } else if (detail.matchedAttr && (detail.type === 'calc' || detail.type === 'modifier')) {
      dice.push({
        value: detail.value || detail.total || 0,
        matchedAttr: detail.matchedAttr,
        critical: false,
        id: "".concat(idPrefix, "-").concat(dIdx, "-0"),
        faces: 6
      });
    }
  });
  return dice.sort((a, b) => {
    const rankA = a.critical ? 1 : a.matchedAttr ? 2 : 0;
    const rankB = b.critical ? 1 : b.matchedAttr ? 2 : 0;
    return rankA - rankB;
  });
};
const isValidSelectionBoxPoint = point => Number.isFinite(point === null || point === void 0 ? void 0 : point.x) && Number.isFinite(point === null || point === void 0 ? void 0 : point.y);
const isValidSelectionBox = box => isValidSelectionBoxPoint(box === null || box === void 0 ? void 0 : box.start) && isValidSelectionBoxPoint(box === null || box === void 0 ? void 0 : box.current);
const isCombatDieEvaded = function (die) {
  let evadedIds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const ids = Array.isArray(evadedIds) ? evadedIds : [];
  const rawDieId = typeof (die === null || die === void 0 ? void 0 : die.id) === 'string' ? die.id : '';
  const unprefixedDieId = rawDieId.startsWith('att-') || rawDieId.startsWith('atk-') || rawDieId.startsWith('roll-') ? rawDieId.replace(/^[^-]+-/, '') : rawDieId;
  return ids.includes(rawDieId) || ids.includes(unprefixedDieId);
};
const getCombatRollValue = rollValue => typeof rollValue === 'object' && rollValue !== null ? Number(rollValue.value) || 0 : Number(rollValue) || 0;
const getBallisticWeaponDamageFromRoll = function (rollResult) {
  let evadedIds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const safeEvadedIds = Array.isArray(evadedIds) ? evadedIds : [];
  return ((rollResult === null || rollResult === void 0 ? void 0 : rollResult.details) || []).reduce((total, detail, dIdx) => {
    if ((detail === null || detail === void 0 ? void 0 : detail.type) !== 'dice' || !detail.ballisticEligible) return total;
    const rolls = Array.isArray(detail.rolls) ? detail.rolls : [];
    return total + rolls.reduce((sum, rollValue, rIdx) => {
      const rawId = "".concat(dIdx, "-").concat(rIdx);
      if (safeEvadedIds.includes(rawId) || safeEvadedIds.includes("att-".concat(rawId)) || safeEvadedIds.includes("atk-".concat(rawId)) || safeEvadedIds.includes("roll-".concat(rawId))) {
        return sum;
      }
      return sum + getCombatRollValue(rollValue);
    }, 0);
  }, 0);
};
const getBaseWeaponDamageFormula = weapon => {
  var _ref9, _ref0, _weapon$dano;
  const itemDamage = (_ref9 = (_ref0 = (_weapon$dano = weapon === null || weapon === void 0 ? void 0 : weapon.dano) !== null && _weapon$dano !== void 0 ? _weapon$dano : weapon === null || weapon === void 0 ? void 0 : weapon.poder) !== null && _ref0 !== void 0 ? _ref0 : weapon === null || weapon === void 0 ? void 0 : weapon.damage) !== null && _ref9 !== void 0 ? _ref9 : '';
  const baseFormula = parseDamage(itemDamage);
  const hasExplicitZeroBase = baseFormula === '0' || /^(\d*)d0$/i.test(baseFormula);
  if (!baseFormula || hasExplicitZeroBase) return '';
  return baseFormula;
};
const buildGuardiaParryRollWeapon = weapon => {
  if (!weapon || !hasCombatTrait(weapon, 'guardia')) return weapon;
  const guardiaDieFormula = getBaseWeaponDamageFormula(weapon);
  if (!guardiaDieFormula) return weapon;
  return _objectSpread(_objectSpread({}, weapon), {}, {
    extraDamageString: weapon.extraDamageString ? "".concat(weapon.extraDamageString, " + ").concat(guardiaDieFormula) : guardiaDieFormula
  });
};
const buildParryWeaponSummaryLabel = function () {
  let steps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const counts = new globalThis.Map();
  steps.forEach(step => {
    var _step$weapon, _step$weapon2;
    const name = (step === null || step === void 0 ? void 0 : step.weaponName) || (step === null || step === void 0 ? void 0 : (_step$weapon = step.weapon) === null || _step$weapon === void 0 ? void 0 : _step$weapon.nombre) || (step === null || step === void 0 ? void 0 : (_step$weapon2 = step.weapon) === null || _step$weapon2 === void 0 ? void 0 : _step$weapon2.name);
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  if (counts.size === 0) return null;
  return Array.from(counts.entries()).map(_ref1 => {
    let [name, count] = _ref1;
    return count > 1 ? "".concat(name, " x").concat(count) : name;
  }).join(' · ');
};
const GLOBAL_PARRY_TRAIT_IDS = new Set(['agudeza', 'derribo', 'hendir', 'conmocionante', 'sangrado', 'ralentizado', 'perforante', 'empuje', 'balistico']);
const NON_STATUS_COMBAT_EFFECT_IDS = new Set(['ralentizado', 'empuje']);
const RALENTIZADO_EFFECT_LABEL = 'Ralentizado';
const RALENTIZADO_EFFECT_HEX = '#fcd34d';
const EMPUJE_EFFECT_LABEL = 'Empuje';
const EMPUJE_EFFECT_HEX = '#38bdf8';
const normalizeTokenStatusIds = function () {
  let statuses = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return Array.isArray(statuses) ? statuses.filter(statusId => !NON_STATUS_COMBAT_EFFECT_IDS.has(normalizeCombatTraitId(statusId))) : [];
};
const buildAggregateCombatWeapon = function () {
  var _steps$find;
  let steps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const firstWeapon = (_steps$find = steps.find(step => step === null || step === void 0 ? void 0 : step.weapon)) === null || _steps$find === void 0 ? void 0 : _steps$find.weapon;
  if (!firstWeapon) return null;
  const mergedTraits = Array.from(new Set(steps.flatMap(step => getItemTraits(step === null || step === void 0 ? void 0 : step.weapon)).filter(traitId => GLOBAL_PARRY_TRAIT_IDS.has(normalizeCombatTraitId(traitId)))));
  const summaryName = buildParryWeaponSummaryLabel(steps) || (firstWeapon === null || firstWeapon === void 0 ? void 0 : firstWeapon.nombre) || (firstWeapon === null || firstWeapon === void 0 ? void 0 : firstWeapon.name) || 'Parada';
  return _objectSpread(_objectSpread({}, firstWeapon), {}, {
    nombre: summaryName,
    name: summaryName,
    rasgos: mergedTraits,
    traits: mergedTraits,
    trait: mergedTraits,
    properties: mergedTraits
  });
};
const buildAggregateAttackWeapon = function () {
  var _steps$find2;
  let steps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const firstWeapon = (_steps$find2 = steps.find(step => step === null || step === void 0 ? void 0 : step.weapon)) === null || _steps$find2 === void 0 ? void 0 : _steps$find2.weapon;
  if (!firstWeapon) return null;
  const mergedTraits = Array.from(new Set(steps.flatMap(step => getItemTraits(step === null || step === void 0 ? void 0 : step.weapon))));
  const summaryName = buildParryWeaponSummaryLabel(steps) || (firstWeapon === null || firstWeapon === void 0 ? void 0 : firstWeapon.nombre) || (firstWeapon === null || firstWeapon === void 0 ? void 0 : firstWeapon.name) || 'Ataque';
  return _objectSpread(_objectSpread({}, firstWeapon), {}, {
    nombre: summaryName,
    name: summaryName,
    rasgos: mergedTraits,
    traits: mergedTraits,
    trait: mergedTraits,
    properties: mergedTraits
  });
};
const combineAttackRollResults = function () {
  let steps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const rollResults = steps.map(step => step === null || step === void 0 ? void 0 : step.rollResult).filter(Boolean);
  return {
    formula: rollResults.map(roll => roll.formula).filter(Boolean).join(' + '),
    total: rollResults.reduce((sum, roll) => sum + (Number(roll.total) || 0), 0),
    details: rollResults.flatMap((roll, attackIndex) => (roll.details || []).map(detail => _objectSpread(_objectSpread({}, detail), {}, {
      rolls: Array.isArray(detail.rolls) ? detail.rolls.map(rollValue => typeof rollValue === 'object' && rollValue !== null ? _objectSpread({}, rollValue) : rollValue) : [],
      attackIndex
    })))
  };
};
const isAttributeCombatTrait = function () {
  let trait = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return /(vigor|destreza|intelecto|voluntad)\s*(?:\(x?\d+\))?/i.test(String(trait || ''));
};
const buildSweepWeapon = weapon => {
  if (!weapon) return null;
  const rawTraits = weapon.rasgos || weapon.traits || weapon.trait || weapon.properties || [];
  const traitList = Array.isArray(rawTraits) ? rawTraits : String(rawTraits || '').split(',');
  const preservedTraits = traitList.filter(trait => isAttributeCombatTrait(trait));
  const sanitizedWeapon = _objectSpread(_objectSpread({}, weapon), {}, {
    rasgos: preservedTraits,
    traits: preservedTraits,
    trait: preservedTraits,
    properties: preservedTraits,
    manualCombatTraits: [],
    _manualCombatTraits: [],
    sweepSourceWeaponName: (weapon === null || weapon === void 0 ? void 0 : weapon.nombre) || (weapon === null || weapon === void 0 ? void 0 : weapon.name) || null,
    sweepMode: true
  });
  if ('extraDamageString' in sanitizedWeapon) {
    delete sanitizedWeapon.extraDamageString;
  }
  return sanitizedWeapon;
};
const isSweepEligibleWeapon = weapon => {
  if (!weapon || weapon.type !== 'weapon') return false;
  const rangeData = getCombatRangeData(weapon);
  return rangeData.value <= 1 && getSpeedConsumption(weapon) >= 2;
};
const getTokenGridBounds = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const cellW = config.cellWidth || 50;
  const cellH = config.cellHeight || 50;
  const gridRect = spatial_getGridWorldRect(config);
  return {
    x: Math.round((((token === null || token === void 0 ? void 0 : token.x) || 0) - gridRect.x) / cellW),
    y: Math.round((((token === null || token === void 0 ? void 0 : token.y) || 0) - gridRect.y) / cellH),
    w: Math.max(1, Math.round(((token === null || token === void 0 ? void 0 : token.width) || cellW) / cellW)),
    h: Math.max(1, Math.round(((token === null || token === void 0 ? void 0 : token.height) || cellH) / cellH))
  };
};
const getTokenOccupiedGridCells = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const bounds = getTokenGridBounds(token, config);
  const cells = [];
  for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
    for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
      cells.push({
        x,
        y
      });
    }
  }
  return cells;
};
const legacyCombatRules_getTokenPrimaryGridCell = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const bounds = getTokenGridBounds(token, config);
  return {
    x: bounds.x,
    y: bounds.y
  };
};
const getCellOccupants = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let cell = arguments.length > 1 ? arguments[1] : undefined;
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let excludeIds = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
  const excluded = new Set(excludeIds);
  return (items || []).filter(item => {
    if (!legacyCombatRules_isCombatTokenItem(item) || excluded.has(item.id)) return false;
    const occupiedCells = getTokenOccupiedGridCells(item, config);
    return occupiedCells.some(occupiedCell => occupiedCell.x === cell.x && occupiedCell.y === cell.y);
  });
};
const getTokenCombatCellContext = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!legacyCombatRules_isCombatTokenItem(token)) {
    return {
      mode: 'solo',
      cell: null,
      occupants: [],
      pairedOccupants: []
    };
  }
  const bounds = getTokenGridBounds(token, config);
  if (!canTokenShareCombatCell(token, config) || bounds.w !== 1 || bounds.h !== 1) {
    return {
      mode: 'solo',
      cell: legacyCombatRules_getTokenPrimaryGridCell(token, config),
      occupants: [token],
      pairedOccupants: []
    };
  }
  const cell = legacyCombatRules_getTokenPrimaryGridCell(token, config);
  const occupants = getCellOccupants(items, cell, config);
  const pairedOccupants = occupants.filter(occupant => occupant.id !== token.id);
  if (pairedOccupants.length === 0) {
    return {
      mode: 'solo',
      cell,
      occupants,
      pairedOccupants
    };
  }
  const hasEnemy = pairedOccupants.some(occupant => !legacyCombatRules_areTokensAllied(token, occupant));
  const mode = hasEnemy ? 'duel' : 'formation';
  return {
    mode,
    cell,
    occupants,
    pairedOccupants
  };
};
const getTokenDuelContextAgainstAttacker = function (targetToken, attackerToken) {
  let items = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  let config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  if (!targetToken || !attackerToken) {
    return {
      mode: 'solo',
      cell: null,
      occupants: [],
      pairedOccupants: [],
      isDuelWithAttacker: false
    };
  }
  const targetContext = getTokenCombatCellContext(targetToken, items, config);
  const attackerInTargetCell = targetContext.pairedOccupants.some(occupant => occupant.id === attackerToken.id);
  const isDuelWithAttacker = targetContext.mode === 'duel' && attackerInTargetCell && !legacyCombatRules_areTokensAllied(targetToken, attackerToken);
  return _objectSpread(_objectSpread({}, targetContext), {}, {
    mode: isDuelWithAttacker ? 'duel' : 'solo',
    isDuelWithAttacker
  });
};
const getCombatRenderPlacement = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const rawX = Number(token === null || token === void 0 ? void 0 : token.x) || 0;
  const rawY = Number(token === null || token === void 0 ? void 0 : token.y) || 0;
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const width = Number(token === null || token === void 0 ? void 0 : token.width) || cellW;
  const height = Number(token === null || token === void 0 ? void 0 : token.height) || cellH;
  const bounds = getTokenGridBounds(token, config);
  const occupiesSingleCell = bounds.w === 1 && bounds.h === 1;
  if (!canTokenShareCombatCell(token, config) || !occupiesSingleCell) {
    return {
      x: rawX,
      y: rawY
    };
  }
  const context = getTokenCombatCellContext(token, items, config);
  if (context.occupants.length !== 2) {
    return {
      x: rawX,
      y: rawY
    };
  }
  const cell = legacyCombatRules_getTokenPrimaryGridCell(token, config);
  const cellRect = getGridCellWorldRect(cell, config);
  const orderedOccupants = [...context.occupants].sort((a, b) => {
    const sideA = Array.from(getTokenCombatSideKeys(a)).sort().join('|');
    const sideB = Array.from(getTokenCombatSideKeys(b)).sort().join('|');
    const sideDelta = sideA.localeCompare(sideB);
    if (sideDelta !== 0) return sideDelta;
    return String(a.id).localeCompare(String(b.id));
  });
  const slotIndex = orderedOccupants.findIndex(occupant => occupant.id === token.id);
  if (slotIndex < 0) {
    return {
      x: rawX,
      y: rawY
    };
  }
  return {
    x: cellRect.x + (slotIndex === 0 ? cellW - width : 0),
    y: cellRect.y + (cellH - height) / 2
  };
};
const getCombatRenderPlacementAtPosition = function (token) {
  let position = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let items = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  let config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  if (!legacyCombatRules_isCombatTokenItem(token)) {
    return {
      x: Number(position.x) || 0,
      y: Number(position.y) || 0
    };
  }
  const simulatedToken = _objectSpread(_objectSpread({}, token), {}, {
    x: Number(position.x),
    y: Number(position.y)
  });
  const simulatedItems = (items || []).map(item => item.id === token.id ? simulatedToken : item);
  return getCombatRenderPlacement(simulatedToken, simulatedItems, config);
};
const legacyCombatRules_getCombatCellOccupancyIssue = _ref10 => {
  let {
    movingToken,
    nextX,
    nextY,
    items = [],
    config = {},
    excludeIds = []
  } = _ref10;
  if (!legacyCombatRules_isCombatTokenItem(movingToken)) return null;
  const movedToken = _objectSpread(_objectSpread({}, movingToken), {}, {
    x: nextX,
    y: nextY
  });
  const movedBounds = getTokenGridBounds(movedToken, config);
  const movedCells = [];
  for (let x = movedBounds.x; x < movedBounds.x + movedBounds.w; x += 1) {
    for (let y = movedBounds.y; y < movedBounds.y + movedBounds.h; y += 1) {
      movedCells.push({
        x,
        y
      });
    }
  }
  const excluded = new Set([movingToken.id, ...excludeIds]);
  const movingCanShare = canTokenShareCombatCell(movedToken, config) && movedBounds.w === 1 && movedBounds.h === 1;
  for (const cell of movedCells) {
    const occupants = getCellOccupants(items, cell, config, Array.from(excluded));
    if (occupants.length === 0) continue;
    if (occupants.length >= 2) {
      return {
        cell,
        reason: 'Casilla ocupada'
      };
    }
    if (!movingCanShare) {
      return {
        cell,
        reason: 'No cabe en duelo'
      };
    }
    if (occupants.length === 1) {
      const other = occupants[0];
      const otherBounds = getTokenGridBounds(other, config);
      const otherCanShare = canTokenShareCombatCell(other, config) && otherBounds.w === 1 && otherBounds.h === 1;
      if (!otherCanShare) {
        return {
          cell,
          reason: 'Ficha grande bloquea'
        };
      }
    }
  }
  return null;
};
const canOccupyCombatCell = params => !legacyCombatRules_getCombatCellOccupancyIssue(params);
const MOBILE_TACTICAL_MOVE_RANGE = 2;
const getCombatGridCenter = function (token) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const bounds = getTokenGridBounds(token, config);
  return {
    x: bounds.x + (bounds.w - 1) / 2,
    y: bounds.y + (bounds.h - 1) / 2
  };
};
const getWorldCenter = token => ({
  x: (Number(token === null || token === void 0 ? void 0 : token.x) || 0) + (Number(token === null || token === void 0 ? void 0 : token.width) || 0) / 2,
  y: (Number(token === null || token === void 0 ? void 0 : token.y) || 0) + (Number(token === null || token === void 0 ? void 0 : token.height) || 0) / 2
});
const getPlacementCenter = function (token) {
  let placement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return {
    x: (Number(placement === null || placement === void 0 ? void 0 : placement.x) || 0) + (Number(token === null || token === void 0 ? void 0 : token.width) || 0) / 2,
    y: (Number(placement === null || placement === void 0 ? void 0 : placement.y) || 0) + (Number(token === null || token === void 0 ? void 0 : token.height) || 0) / 2
  };
};
const legacyCombatRules_getCombatTokenPositionForPrimaryCell = function (token, cell) {
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const cellRect = getGridCellWorldRect(cell, config);
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const width = Number(token === null || token === void 0 ? void 0 : token.width) || cellW;
  const height = Number(token === null || token === void 0 ? void 0 : token.height) || cellH;
  const bounds = getTokenGridBounds(token, config);
  const occupiesSingleCell = bounds.w === 1 && bounds.h === 1;
  return occupiesSingleCell ? {
    x: cellRect.x + (cellW - width) / 2,
    y: cellRect.y + (cellH - height) / 2
  } : {
    x: cellRect.x,
    y: cellRect.y
  };
};
const legacyCombatRules_getTokenOccupiedCellsAtPosition = function (token) {
  let position = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return getTokenOccupiedGridCells(_objectSpread(_objectSpread({}, token), {}, {
    x: Number(position === null || position === void 0 ? void 0 : position.x) || 0,
    y: Number(position === null || position === void 0 ? void 0 : position.y) || 0
  }), config);
};
const legacyCombatRules_isCombatMoveBlockedByWall = function (token, nextPosition) {
  let items = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  let config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const tokenWidth = Number(token === null || token === void 0 ? void 0 : token.width) || cellW;
  const tokenHeight = Number(token === null || token === void 0 ? void 0 : token.height) || cellH;
  const startCenter = {
    x: (Number(token === null || token === void 0 ? void 0 : token.x) || 0) + tokenWidth / 2,
    y: (Number(token === null || token === void 0 ? void 0 : token.y) || 0) + tokenHeight / 2
  };
  const endCenter = {
    x: (Number(nextPosition === null || nextPosition === void 0 ? void 0 : nextPosition.x) || 0) + tokenWidth / 2,
    y: (Number(nextPosition === null || nextPosition === void 0 ? void 0 : nextPosition.y) || 0) + tokenHeight / 2
  };
  return (items || []).filter(item => item.type === 'wall' && !(item.wallType === 'door' && item.isOpen)).some(wall => linesIntersect(startCenter.x, startCenter.y, endCenter.x, endCenter.y, wall.x1, wall.y1, wall.x2, wall.y2) || lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2, nextPosition.x + 2, nextPosition.y + 2, tokenWidth - 4, tokenHeight - 4));
};
const getMobileTacticalMoveOptions = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let range = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : MOBILE_TACTICAL_MOVE_RANGE;
  let options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  const {
    requireCombatActive = true,
    validateOccupancy = true,
    validateWalls = true,
    allowInactiveOccupancy = false
  } = options || {};
  if (requireCombatActive && !(config !== null && config !== void 0 && config.isCombatActive) || !isMobileTacticalMoveToken(token)) return [];
  const originCell = legacyCombatRules_getTokenPrimaryGridCell(token, config);
  const moveOptions = [];
  for (let dx = -range; dx <= range; dx += 1) {
    for (let dy = -range; dy <= range; dy += 1) {
      let cost = Math.max(Math.abs(dx), Math.abs(dy));
      if (cost <= 0 || cost > range) continue;
      const cell = {
        x: originCell.x + dx,
        y: originCell.y + dy
      };
      if (!isGridCellInsideBounds(cell, config)) continue;
      const nextPosition = legacyCombatRules_getCombatTokenPositionForPrimaryCell(token, cell, config);
      cost = getTerrainMovementCost({
        token,
        from: token,
        to: nextPosition,
        items,
        config
      });
      if (cost > range) continue;
      const occupiedCells = legacyCombatRules_getTokenOccupiedCellsAtPosition(token, nextPosition, config);
      if (occupiedCells.some(occupiedCell => !isGridCellInsideBounds(occupiedCell, config))) continue;
      if (validateOccupancy && !canOccupyCombatCell({
        movingToken: token,
        nextX: nextPosition.x,
        nextY: nextPosition.y,
        items,
        config,
        excludeIds: [token.id],
        allowInactiveCombat: allowInactiveOccupancy
      })) {
        continue;
      }
      if (validateWalls && legacyCombatRules_isCombatMoveBlockedByWall(token, nextPosition, items, config)) continue;
      moveOptions.push({
        cell,
        cost,
        nextPosition,
        occupiedCells
      });
    }
  }
  return moveOptions.sort((a, b) => a.cost - b.cost || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
};
const getEmpujeDirection = function (sourceToken, pushedToken) {
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let items = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
  if (!sourceToken || !pushedToken) return null;
  const sourceCenter = getCombatGridCenter(sourceToken, config);
  const pushedCenter = getCombatGridCenter(pushedToken, config);
  let dx = Math.sign(pushedCenter.x - sourceCenter.x);
  let dy = Math.sign(pushedCenter.y - sourceCenter.y);
  if (dx === 0 && dy === 0) {
    const sourceWorld = getWorldCenter(sourceToken);
    const pushedWorld = getWorldCenter(pushedToken);
    dx = Math.sign(pushedWorld.x - sourceWorld.x);
    dy = Math.sign(pushedWorld.y - sourceWorld.y);
  }
  if (dx === 0 && dy === 0 && Array.isArray(items) && items.length > 0) {
    const sourcePlacement = getPlacementCenter(sourceToken, getCombatRenderPlacement(sourceToken, items, config));
    const pushedPlacement = getPlacementCenter(pushedToken, getCombatRenderPlacement(pushedToken, items, config));
    dx = Math.sign(pushedPlacement.x - sourcePlacement.x);
    dy = Math.sign(pushedPlacement.y - sourcePlacement.y);
  }
  if (dx === 0 && dy === 0) return null;
  return {
    dx,
    dy
  };
};
const resolveEmpujeMovement = _ref11 => {
  let {
    sourceToken,
    pushedToken,
    items = [],
    config = {}
  } = _ref11;
  if (!sourceToken || !pushedToken || !legacyCombatRules_isCombatTokenItem(pushedToken)) {
    return {
      applied: false,
      reason: 'Objetivo inválido'
    };
  }
  const direction = getEmpujeDirection(sourceToken, pushedToken, config, items);
  if (!direction) {
    return {
      applied: false,
      reason: 'Sin dirección clara'
    };
  }
  const cellW = Number(config.cellWidth) || DEFAULT_GRID_CONFIG.cellWidth;
  const cellH = Number(config.cellHeight) || DEFAULT_GRID_CONFIG.cellHeight;
  const nextX = roundGridValue((Number(pushedToken.x) || 0) + direction.dx * cellW);
  const nextY = roundGridValue((Number(pushedToken.y) || 0) + direction.dy * cellH);
  const movedToken = _objectSpread(_objectSpread({}, pushedToken), {}, {
    x: nextX,
    y: nextY
  });
  const movedCells = getTokenOccupiedGridCells(movedToken, config);
  if (movedCells.some(cell => !isGridCellInsideBounds(cell, config))) {
    return {
      applied: false,
      reason: 'Borde del mapa',
      direction
    };
  }
  const occupancyIssue = legacyCombatRules_getCombatCellOccupancyIssue({
    movingToken: pushedToken,
    nextX,
    nextY,
    items,
    config
  });
  if (occupancyIssue) {
    return {
      applied: false,
      reason: occupancyIssue.reason || 'Casilla bloqueada',
      direction
    };
  }
  const walls = (items || []).filter(item => item.type === 'wall' && !(item.wallType === 'door' && item.isOpen));
  const startCenter = getWorldCenter(pushedToken);
  const endCenter = getWorldCenter(movedToken);
  const pathBlocked = walls.some(wall => linesIntersect(startCenter.x, startCenter.y, endCenter.x, endCenter.y, wall.x1, wall.y1, wall.x2, wall.y2));
  const overlapBlocked = walls.some(wall => lineRectIntersect(wall.x1, wall.y1, wall.x2, wall.y2, nextX + 2, nextY + 2, (pushedToken.width || cellW) - 4, (pushedToken.height || cellH) - 4));
  if (pathBlocked || overlapBlocked) {
    return {
      applied: false,
      reason: 'Muro bloquea',
      direction
    };
  }
  const fromCell = legacyCombatRules_getTokenPrimaryGridCell(pushedToken, config);
  const toCell = legacyCombatRules_getTokenPrimaryGridCell(movedToken, config);
  const destinationOccupants = getCellOccupants(items, toCell, config, [pushedToken.id]);
  const sharedMode = destinationOccupants.length === 1 ? legacyCombatRules_areTokensAllied(pushedToken, destinationOccupants[0]) ? 'formacion' : 'duelo' : null;
  return {
    applied: true,
    x: nextX,
    y: nextY,
    fromCell,
    toCell,
    direction,
    sharedMode,
    sharedWith: destinationOccupants.map(occupant => ({
      id: occupant.id,
      name: occupant.name || 'Token'
    }))
  };
};
const areCombatOccupancyFeedbacksEqual = (a, b) => {
  var _a$cell$x, _a$cell, _b$cell$x, _b$cell, _a$cell$y, _a$cell2, _b$cell$y, _b$cell2, _a$targetX, _b$targetX, _a$targetY, _b$targetY;
  return ((a === null || a === void 0 ? void 0 : a.tokenId) || null) === ((b === null || b === void 0 ? void 0 : b.tokenId) || null) && ((a === null || a === void 0 ? void 0 : a.reason) || null) === ((b === null || b === void 0 ? void 0 : b.reason) || null) && ((_a$cell$x = a === null || a === void 0 ? void 0 : (_a$cell = a.cell) === null || _a$cell === void 0 ? void 0 : _a$cell.x) !== null && _a$cell$x !== void 0 ? _a$cell$x : null) === ((_b$cell$x = b === null || b === void 0 ? void 0 : (_b$cell = b.cell) === null || _b$cell === void 0 ? void 0 : _b$cell.x) !== null && _b$cell$x !== void 0 ? _b$cell$x : null) && ((_a$cell$y = a === null || a === void 0 ? void 0 : (_a$cell2 = a.cell) === null || _a$cell2 === void 0 ? void 0 : _a$cell2.y) !== null && _a$cell$y !== void 0 ? _a$cell$y : null) === ((_b$cell$y = b === null || b === void 0 ? void 0 : (_b$cell2 = b.cell) === null || _b$cell2 === void 0 ? void 0 : _b$cell2.y) !== null && _b$cell$y !== void 0 ? _b$cell$y : null) && ((_a$targetX = a === null || a === void 0 ? void 0 : a.targetX) !== null && _a$targetX !== void 0 ? _a$targetX : null) === ((_b$targetX = b === null || b === void 0 ? void 0 : b.targetX) !== null && _b$targetX !== void 0 ? _b$targetX : null) && ((_a$targetY = a === null || a === void 0 ? void 0 : a.targetY) !== null && _a$targetY !== void 0 ? _a$targetY : null) === ((_b$targetY = b === null || b === void 0 ? void 0 : b.targetY) !== null && _b$targetY !== void 0 ? _b$targetY : null);
};
const getCombatOccupancyFeedbackForMove = _ref12 => {
  let {
    tokenId,
    movingToken,
    nextX,
    nextY,
    items = [],
    config = {},
    excludeIds = []
  } = _ref12;
  const issue = legacyCombatRules_getCombatCellOccupancyIssue({
    movingToken,
    nextX,
    nextY,
    items,
    config,
    excludeIds
  });
  if (!issue) return null;
  return {
    tokenId,
    cell: issue.cell,
    reason: issue.reason,
    targetX: nextX,
    targetY: nextY
  };
};
const isGridCellInsideBounds = function (cell) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (config.isInfinite) return true;
  const columns = Math.max(1, Math.round(Number(config.columns) || 1));
  const rows = Math.max(1, Math.round(Number(config.rows) || 1));
  return cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows;
};
const getSweepAreaCells = function (token, side) {
  let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!token || !side) return [];
  const bounds = getTokenGridBounds(token, config);
  const centerX = Math.round(bounds.x + (bounds.w - 1) / 2);
  const centerY = Math.round(bounds.y + (bounds.h - 1) / 2);
  let cells = [];
  if (side === 'north' || side === 'south') {
    const rowY = side === 'north' ? bounds.y - 1 : bounds.y + bounds.h;
    const startX = centerX - 1;
    cells = Array.from({
      length: 3
    }, (_, index) => ({
      x: startX + index,
      y: rowY
    }));
  } else if (side === 'west' || side === 'east') {
    const colX = side === 'west' ? bounds.x - 1 : bounds.x + bounds.w;
    const startY = centerY - 1;
    cells = Array.from({
      length: 3
    }, (_, index) => ({
      x: colX,
      y: startY + index
    }));
  }
  return cells.filter(cell => isGridCellInsideBounds(cell, config));
};
const getGridCellWorldRect = function (cell) {
  let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const cellW = config.cellWidth || 50;
  const cellH = config.cellHeight || 50;
  const gridRect = getGridWorldRect(config);
  return {
    x: gridRect.x + cell.x * cellW,
    y: gridRect.y + cell.y * cellH,
    width: cellW,
    height: cellH
  };
};
const getSweepTargetsForCells = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let attackerId = arguments.length > 1 ? arguments[1] : undefined;
  let cells = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  let config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  if (!Array.isArray(items) || cells.length === 0) return [];
  const cellKeys = new Set(cells.map(cell => "".concat(cell.x, ":").concat(cell.y)));
  const attacker = items.find(item => (item === null || item === void 0 ? void 0 : item.id) === attackerId) || null;
  return items.filter(item => {
    if (!item || item.id === attackerId) return false;
    if (item.type === 'light' || item.type === 'wall' || item.type === 'geometry') return false;
    if (!(item.isCircular || item.stats || item.name)) return false;
    if (attacker && legacyCombatRules_areTokensAllied(attacker, item)) return false;
    const bounds = getTokenGridBounds(item, config);
    for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) {
      for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
        if (cellKeys.has("".concat(x, ":").concat(y))) {
          return true;
        }
      }
    }
    return false;
  });
};
const CombatTraitLine = _ref13 => {
  let {
    label,
    traits = [],
    accent = 'slate'
  } = _ref13;
  if (!Array.isArray(traits) || traits.length === 0) return null;
  void label;
  void accent;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-3 h-[1px] bg-slate-800 shrink-0"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-slate-500 italic tracking-wider"
  }, traits.map(trait => formatCombatTraitLabel(trait)).join(' · ')));
};
;// ./src/features/canvas/combat/canvasCombatState.js



const CANVAS_COMBAT_VERSION = 1;
const ACTION_DIE_STATUSES = Object.freeze(['available', 'committed', 'spent']);
const DIE_SIDES = Object.freeze([4, 6, 8, 10, 12, 20]);
const asInteger = function (value) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};
const normalizeDieSides = function (value) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 6;
  const match = String(value !== null && value !== void 0 ? value : '').toLowerCase().match(/d\s*(\d+)/);
  const parsed = match ? Number(match[1]) : Number(value);
  return DIE_SIDES.includes(parsed) ? parsed : fallback;
};
const normalizeActionDiceProfile = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const source = Array.isArray(profile) ? profile : [];
  return source.slice(0, 3).map(die => "d".concat(normalizeDieSides(die)));
};
const rollDie = function (sides) {
  let random = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random;
  return Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * normalizeDieSides(sides)) + 1;
};
const rollDiceProfile = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let random = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random;
  return normalizeActionDiceProfile(profile).map(die => rollDie(die, random));
};
const validateDiceResults = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let values = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const normalizedProfile = normalizeActionDiceProfile(profile);
  if (normalizedProfile.length === 0 || normalizedProfile.length !== values.length) return false;
  return normalizedProfile.every((die, index) => {
    const value = Number(values[index]);
    return Number.isInteger(value) && value >= 1 && value <= normalizeDieSides(die);
  });
};
const createPool = (tokenId, profile, values, round, source) => normalizeActionDiceProfile(profile).map((die, index) => ({
  id: "".concat(tokenId, "-r").concat(round, "-a").concat(index + 1),
  die,
  sides: normalizeDieSides(die),
  value: asInteger(values[index], 1),
  status: 'available',
  source
}));
const getInitiativeBase = token => {
  var _ref, _token$initiativeBase, _token$stats, _token$stats$iniciati, _token$stats2, _token$stats2$iniciat;
  return Math.max(0, asInteger((_ref = (_token$initiativeBase = token === null || token === void 0 ? void 0 : token.initiativeBase) !== null && _token$initiativeBase !== void 0 ? _token$initiativeBase : token === null || token === void 0 ? void 0 : (_token$stats = token.stats) === null || _token$stats === void 0 ? void 0 : (_token$stats$iniciati = _token$stats.iniciativa) === null || _token$stats$iniciati === void 0 ? void 0 : _token$stats$iniciati.current) !== null && _ref !== void 0 ? _ref : token === null || token === void 0 ? void 0 : (_token$stats2 = token.stats) === null || _token$stats2 === void 0 ? void 0 : (_token$stats2$iniciat = _token$stats2.iniciativa) === null || _token$stats2$iniciat === void 0 ? void 0 : _token$stats2$iniciat.max, 0));
};
const getEnemyInitiative = token => {
  var _ref2, _token$fixedInitiativ, _token$stats3, _token$stats3$iniciat;
  return Math.max(0, asInteger((_ref2 = (_token$fixedInitiativ = token === null || token === void 0 ? void 0 : token.fixedInitiative) !== null && _token$fixedInitiativ !== void 0 ? _token$fixedInitiativ : token === null || token === void 0 ? void 0 : (_token$stats3 = token.stats) === null || _token$stats3 === void 0 ? void 0 : (_token$stats3$iniciat = _token$stats3.iniciativa) === null || _token$stats3$iniciat === void 0 ? void 0 : _token$stats3$iniciat.current) !== null && _ref2 !== void 0 ? _ref2 : token === null || token === void 0 ? void 0 : token.velocidad, 0));
};
const isCombatParticipant = token => ['rogueliteClass', 'rogueliteEnemy', 'campaignCharacter'].includes(token === null || token === void 0 ? void 0 : token.profileType);
const getParticipantSide = token => token.profileType === 'rogueliteEnemy' ? 'enemies' : 'players';
const defaultEnemyActions = function () {
  let campaign = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  return [{
    id: 'movement',
    label: 'Movimiento',
    type: 'movement',
    status: 'available'
  }, {
    id: 'attack',
    label: 'Ataque',
    type: 'attack',
    status: 'available'
  }, ...(campaign ? [{
    id: 'defense',
    label: 'Defensa',
    type: 'defense',
    status: 'available'
  }] : [])];
};
const getMovementBase = token => {
  var _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _token$stats4, _token$stats4$movimie, _token$stats5, _token$stats5$movimie, _token$stats6, _token$stats6$movimie, _token$stats7;
  return Math.max(0, asInteger((_ref3 = (_ref4 = (_ref5 = (_ref6 = (_ref7 = (_ref8 = (token === null || token === void 0 ? void 0 : (_token$stats4 = token.stats) === null || _token$stats4 === void 0 ? void 0 : (_token$stats4$movimie = _token$stats4.movimiento) === null || _token$stats4$movimie === void 0 ? void 0 : _token$stats4$movimie.potionBase) != null ? Number(token.stats.movimiento.potionBase) + Number(token.stats.movimiento.potionBonus || 0) : undefined) !== null && _ref8 !== void 0 ? _ref8 : token === null || token === void 0 ? void 0 : (_token$stats5 = token.stats) === null || _token$stats5 === void 0 ? void 0 : (_token$stats5$movimie = _token$stats5.movimiento) === null || _token$stats5$movimie === void 0 ? void 0 : _token$stats5$movimie.max) !== null && _ref7 !== void 0 ? _ref7 : token === null || token === void 0 ? void 0 : (_token$stats6 = token.stats) === null || _token$stats6 === void 0 ? void 0 : (_token$stats6$movimie = _token$stats6.movimiento) === null || _token$stats6$movimie === void 0 ? void 0 : _token$stats6$movimie.current) !== null && _ref6 !== void 0 ? _ref6 : token === null || token === void 0 ? void 0 : (_token$stats7 = token.stats) === null || _token$stats7 === void 0 ? void 0 : _token$stats7.movement) !== null && _ref5 !== void 0 ? _ref5 : token === null || token === void 0 ? void 0 : token.movimiento) !== null && _ref4 !== void 0 ? _ref4 : token === null || token === void 0 ? void 0 : token.movement) !== null && _ref3 !== void 0 ? _ref3 : 2, 2));
};
const getMovementStatMax = token => {
  var _ref9, _ref0, _ref1, _ref10, _ref11, _token$stats$movimien, _token$stats8, _token$stats8$movimie, _token$stats9, _token$stats9$movimie, _token$stats0, _token$stats0$movimie, _token$stats1;
  return Math.max(0, asInteger((_ref9 = (_ref0 = (_ref1 = (_ref10 = (_ref11 = (_token$stats$movimien = token === null || token === void 0 ? void 0 : (_token$stats8 = token.stats) === null || _token$stats8 === void 0 ? void 0 : (_token$stats8$movimie = _token$stats8.movimiento) === null || _token$stats8$movimie === void 0 ? void 0 : _token$stats8$movimie.potionBase) !== null && _token$stats$movimien !== void 0 ? _token$stats$movimien : token === null || token === void 0 ? void 0 : (_token$stats9 = token.stats) === null || _token$stats9 === void 0 ? void 0 : (_token$stats9$movimie = _token$stats9.movimiento) === null || _token$stats9$movimie === void 0 ? void 0 : _token$stats9$movimie.max) !== null && _ref11 !== void 0 ? _ref11 : token === null || token === void 0 ? void 0 : (_token$stats0 = token.stats) === null || _token$stats0 === void 0 ? void 0 : (_token$stats0$movimie = _token$stats0.movimiento) === null || _token$stats0$movimie === void 0 ? void 0 : _token$stats0$movimie.current) !== null && _ref10 !== void 0 ? _ref10 : token === null || token === void 0 ? void 0 : (_token$stats1 = token.stats) === null || _token$stats1 === void 0 ? void 0 : _token$stats1.movement) !== null && _ref1 !== void 0 ? _ref1 : token === null || token === void 0 ? void 0 : token.movimiento) !== null && _ref0 !== void 0 ? _ref0 : token === null || token === void 0 ? void 0 : token.movement) !== null && _ref9 !== void 0 ? _ref9 : 2, 2));
};
const getMovementAllowance = participant => {
  const runtime = participant === null || participant === void 0 ? void 0 : participant.movementRuntime;
  if (!runtime) return 0;
  const base = Number(runtime.base) || 0;
  const modifier = Number(runtime.modifier) || 0;
  const sprintBonus = Number(runtime.sprintBonus) || 0;
  return Math.max(0, (runtime.bleedingForfeit ? 0 : base + modifier) + sprintBonus);
};
const getAvailableMovement = participant => {
  var _participant$defensiv;
  const defensiveRemaining = Number(participant === null || participant === void 0 ? void 0 : (_participant$defensiv = participant.defensiveReposition) === null || _participant$defensiv === void 0 ? void 0 : _participant$defensiv.remaining);
  if (Number.isFinite(defensiveRemaining) && defensiveRemaining > 0) return defensiveRemaining;
  const runtime = participant === null || participant === void 0 ? void 0 : participant.movementRuntime;
  if (!runtime) return 0;
  const spent = Number(runtime.spent) || 0;
  return Math.max(0, getMovementAllowance(participant) - spent);
};
const createParticipant = (token, index) => {
  var _token$stats10, _token$stats10$movimi;
  const side = getParticipantSide(token);
  const profile = side === 'players' ? normalizeActionDiceProfile(token.profileType === 'campaignCharacter' ? (token.actionDice || []).filter(Boolean) : token.actionDice) : [];
  const initiativeBase = side === 'players' ? getInitiativeBase(token) : getEnemyInitiative(token);
  const movementBase = getMovementBase(token);
  return _objectSpread2(_objectSpread2(_objectSpread2({
    tokenId: token.id
  }, token.rulesSystem === 'campaign' ? {
    rulesSystem: 'campaign',
    defenseRefreshed: false,
    initiativeTeamId: legacyCombatRules_normalizeCombatSideKey(token.teamId || '')
  } : {}), (_token$stats10 = token.stats) !== null && _token$stats10 !== void 0 && (_token$stats10$movimi = _token$stats10.movimiento) !== null && _token$stats10$movimi !== void 0 && _token$stats10$movimi.potionBonus ? {
    hasteBonus: token.stats.movimiento.potionBonus
  } : {}), {}, {
    name: token.name || (side === 'players' ? 'Aventurero' : 'Enemigo'),
    portrait: token.portrait || token.img || '',
    side,
    orderIndex: index,
    profileId: side === 'enemies' ? token.linkedEnemyId || token.id : token.linkedClassId || token.id,
    initiativeBase,
    initiative: side === 'enemies' ? initiativeBase : null,
    actionDiceProfile: profile,
    actionDice: [],
    enemyActions: side === 'enemies' ? defaultEnemyActions(token.rulesSystem === 'campaign') : [],
    movementRuntime: {
      base: movementBase,
      statMax: getMovementStatMax(token),
      modifier: 0,
      spent: 0,
      sprintBonus: 0,
      sprintDieId: null,
      sprintDieIds: [],
      history: []
    },
    awaitingRoll: side === 'players' && profile.length > 0,
    threatDie: side === 'enemies' && token.threatDie ? "d".concat(normalizeDieSides(token.threatDie)) : null,
    threatValue: null,
    independentInitiative: Boolean(token.independentInitiative)
  });
};
const sortCombatParticipants = participants => [...participants].sort((left, right) => {
  const initiativeDelta = (right.initiative || 0) - (left.initiative || 0);
  if (initiativeDelta !== 0) return initiativeDelta;
  if (left.rulesSystem === 'campaign' && right.rulesSystem === 'campaign' && left.side === 'players' && right.side === 'players') {
    for (let index = 0; index < 3; index += 1) {
      var _right$initiativeDice, _left$initiativeDice;
      const delta = (((_right$initiativeDice = right.initiativeDice) === null || _right$initiativeDice === void 0 ? void 0 : _right$initiativeDice[index]) || 0) - (((_left$initiativeDice = left.initiativeDice) === null || _left$initiativeDice === void 0 ? void 0 : _left$initiativeDice[index]) || 0);
      if (delta) return delta;
    }
  }
  if (left.side !== right.side) return left.side === 'enemies' ? -1 : 1;
  return left.orderIndex - right.orderIndex;
});
const buildInitiativeBlocks = function () {
  let participantsById = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const sorted = sortCombatParticipants(Object.values(participantsById).filter(participant => participant.initiative !== null && participant.initiative !== undefined && Number.isFinite(Number(participant.initiative))));
  const blocks = [];
  const playerTeams = new Set(sorted.filter(p => p.side === 'players').map(p => p.initiativeTeamId).filter(Boolean));
  sorted.forEach(participant => {
    const previous = blocks[blocks.length - 1];
    const teamId = participant.rulesSystem === 'campaign' ? participant.initiativeTeamId || '' : '';
    const sameTeam = !teamId && !(previous !== null && previous !== void 0 && previous.teamId);
    const joinsTeamBlock = teamId && (previous === null || previous === void 0 ? void 0 : previous.teamId) === teamId && !participant.independentInitiative && !previous.independentInitiative;
    const joinsPlayerBlock = sameTeam && (previous === null || previous === void 0 ? void 0 : previous.side) === 'players' && participant.side === 'players';
    const joinsEnemyBlock = (previous === null || previous === void 0 ? void 0 : previous.side) === 'enemies' && participant.side === 'enemies' && sameTeam && !participant.independentInitiative && previous.profileId === participant.profileId && previous.initiative === participant.initiative;
    if (joinsTeamBlock || joinsPlayerBlock || joinsEnemyBlock) {
      previous.memberIds.push(participant.tokenId);
      previous.initiative = Math.max(previous.initiative, participant.initiative);
      return;
    }
    blocks.push(_objectSpread2(_objectSpread2({
      id: "block-".concat(blocks.length + 1, "-").concat(participant.side),
      side: teamId && playerTeams.has(teamId) ? 'players' : participant.side
    }, teamId ? {
      teamId,
      independentInitiative: Boolean(participant.independentInitiative)
    } : {}), {}, {
      profileId: participant.profileId,
      initiative: participant.initiative,
      memberIds: [participant.tokenId],
      actedIds: []
    }));
  });
  return blocks;
};
const allPlayersReady = participantsById => Object.values(participantsById).filter(participant => participant.side === 'players').every(participant => !participant.awaitingRoll);
const rollEnemyThreat = (participant, random) => participant.threatDie ? rollDie(participant.threatDie, random) : null;
const activateCampaignDefense = state => {
  var _state$blocks, _state$blocks$state$a;
  const ids = ((_state$blocks = state.blocks) === null || _state$blocks === void 0 ? void 0 : (_state$blocks$state$a = _state$blocks[state.activeBlockIndex]) === null || _state$blocks$state$a === void 0 ? void 0 : _state$blocks$state$a.memberIds) || [];
  const participants = _objectSpread2({}, state.participants);
  ids.forEach(id => {
    const p = participants[id];
    if ((p === null || p === void 0 ? void 0 : p.side) !== 'enemies' || p.rulesSystem !== 'campaign' || p.defenseRefreshed) return;
    participants[id] = _objectSpread2(_objectSpread2({}, p), {}, {
      defenseRefreshed: true,
      enemyActions: p.enemyActions.map(action => action.id === 'defense' ? _objectSpread2(_objectSpread2({}, action), {}, {
        status: 'available'
      }) : action)
    });
  });
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants
  });
};
const openTurnPhase = function (state) {
  let random = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random;
  return activateCampaignDefense(_objectSpread2(_objectSpread2({}, state), {}, {
    status: 'active',
    roundPhase: 'turns',
    blocks: buildInitiativeBlocks(state.participants),
    activeBlockIndex: 0,
    participants: Object.fromEntries(Object.entries(state.participants).map(_ref12 => {
      let [id, participant] = _ref12;
      return [id, participant.side === 'enemies' ? _objectSpread2(_objectSpread2({}, participant), {}, {
        threatValue: rollEnemyThreat(participant, random)
      }) : participant];
    }))
  }));
};
const createCanvasCombatState = function () {
  let tokens = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const participants = Object.fromEntries(tokens.filter(token => isCombatParticipant(token) && (options.rulesSystem === 'campaign' ? token.profileType !== 'rogueliteClass' : token.profileType !== 'campaignCharacter')).map((token, index) => createParticipant(options.rulesSystem === 'campaign' ? _objectSpread2(_objectSpread2({}, token), {}, {
    rulesSystem: 'campaign'
  }) : token, index)).map(participant => [participant.tokenId, participant]));
  const now = options.now || Date.now();
  const initial = _objectSpread2(_objectSpread2({
    version: CANVAS_COMBAT_VERSION
  }, options.rulesSystem === 'campaign' ? {
    rulesSystem: 'campaign'
  } : {}), {}, {
    status: 'setup',
    roundPhase: 'rolling',
    round: 1,
    startedAt: now,
    updatedAt: now,
    participants,
    blocks: [],
    activeBlockIndex: 0,
    pendingAttack: null,
    history: []
  });
  return allPlayersReady(participants) ? openTurnPhase(initial, options.random) : initial;
};
const queueCanvasAttack = function (state, attack) {
  var _state$participants, _state$participants2;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!state || !(attack !== null && attack !== void 0 && attack.id) || state.pendingAttack || state.arcaneChain) return state;
  const attacker = (_state$participants = state.participants) === null || _state$participants === void 0 ? void 0 : _state$participants[attack.attackerId];
  const target = (_state$participants2 = state.participants) === null || _state$participants2 === void 0 ? void 0 : _state$participants2[attack.targetId];
  if (!attacker || !target) return state;
  const selectedIds = new Set(attack.actionDieIds || []);
  if (attacker.side === 'players') {
    const selectedDice = (attacker.actionDice || []).filter(die => selectedIds.has(die.id));
    if (selectedDice.length !== selectedIds.size || selectedDice.some(die => die.status !== 'available')) {
      return state;
    }
  }
  const lastAttackWeaponIds = (attack.attackParts || []).map(part => part.weaponId).filter(Boolean).map(String);
  const updatedAttacker = _objectSpread2(_objectSpread2({}, attacker), lastAttackWeaponIds.length ? {
    lastAttackWeaponIds
  } : {});
  const participants = _objectSpread2(_objectSpread2({}, state.participants), {}, {
    [attack.attackerId]: attacker.side === 'players' ? _objectSpread2(_objectSpread2({}, updatedAttacker), {}, {
      actionDice: attacker.actionDice.map(die => selectedIds.has(die.id) ? _objectSpread2(_objectSpread2({}, die), {}, {
        status: 'spent'
      }) : die)
    }) : _objectSpread2(_objectSpread2({}, updatedAttacker), {}, {
      threatValue: attack.usedThreat ? null : attacker.threatValue,
      enemyActions: (attacker.enemyActions || defaultEnemyActions()).map(action => action.id === 'attack' ? _objectSpread2(_objectSpread2({}, action), {}, {
        status: 'spent'
      }) : action)
    })
  });
  const now = options.now || Date.now();
  const serializableAttack = Object.fromEntries(Object.entries(attack).filter(_ref13 => {
    let [, value] = _ref13;
    return value !== undefined;
  }));
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants,
    pendingAttack: _objectSpread2(_objectSpread2({}, serializableAttack), {}, {
      status: attack.needsCunning ? 'awaiting-cunning' : attack.needsAdjustment ? 'awaiting-adjustment' : 'awaiting-defense',
      createdAt: attack.createdAt || now
    }),
    updatedAt: now,
    history: [...(state.history || []).slice(-39), {
      id: "".concat(attack.id, "-queued"),
      type: 'attack-queued',
      attackerId: attack.attackerId,
      targetId: attack.targetId,
      attackId: attack.id,
      round: state.round
    }]
  });
};
const cancelQueuedCanvasAttack = function (state) {
  var _state$participants3;
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!(state !== null && state !== void 0 && state.pendingAttack)) return state;
  const pendingAttack = state.pendingAttack;
  const attacker = (_state$participants3 = state.participants) === null || _state$participants3 === void 0 ? void 0 : _state$participants3[pendingAttack.attackerId];
  const now = options.now || Date.now();
  let nextParticipants = state.participants;
  if (attacker && attacker.side === 'players' && Array.isArray(pendingAttack.actionDice)) {
    const committedIds = new Set(pendingAttack.actionDice.map(d => d.id));
    nextParticipants = _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [pendingAttack.attackerId]: _objectSpread2(_objectSpread2({}, attacker), {}, {
        actionDice: attacker.actionDice.map(die => committedIds.has(die.id) && die.status === 'committed' ? _objectSpread2(_objectSpread2({}, die), {}, {
          status: 'available'
        }) : die)
      })
    });
  }
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: nextParticipants,
    pendingAttack: null,
    updatedAt: now
  });
};
const resolveQueuedCanvasAttack = function (state, resolution) {
  var _state$participants4;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const pendingAttack = state === null || state === void 0 ? void 0 : state.pendingAttack;
  if (!pendingAttack || pendingAttack.id !== (resolution === null || resolution === void 0 ? void 0 : resolution.attackId)) return state;
  const target = (_state$participants4 = state.participants) === null || _state$participants4 === void 0 ? void 0 : _state$participants4[pendingAttack.targetId];
  const now = options.now || Date.now();
  if (!target) {
    return _objectSpread2(_objectSpread2({}, state), {}, {
      pendingAttack: null,
      updatedAt: now
    });
  }
  const selectedIds = new Set(resolution.defenseDieIds || []);
  const selectedDice = (target.actionDice || []).filter(die => selectedIds.has(die.id));
  if (target.side === 'players' && (selectedDice.length !== selectedIds.size || selectedDice.some(die => die.status !== 'committed'))) return state;
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [pendingAttack.targetId]: target.side === 'players' ? _objectSpread2(_objectSpread2({}, target), {}, {
        actionDice: target.actionDice.map(die => selectedIds.has(die.id) ? _objectSpread2(_objectSpread2({}, die), {}, {
          status: 'spent'
        }) : die)
      }) : target
    }),
    pendingAttack: null,
    updatedAt: now,
    history: [...(state.history || []).slice(-39), {
      id: "".concat(pendingAttack.id, "-resolved"),
      type: 'attack-resolved',
      attackId: pendingAttack.id,
      attackerId: pendingAttack.attackerId,
      targetId: pendingAttack.targetId,
      defenseDieIds: [...selectedIds],
      finalPressure: resolution.finalPressure,
      lifeLost: resolution.lifeLost,
      surplus: resolution.surplus,
      round: state.round
    }]
  });
};
const submitActionDice = function (state, tokenId, values) {
  var _state$participants5;
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants5 = state.participants) === null || _state$participants5 === void 0 ? void 0 : _state$participants5[tokenId];
  if (!participant || participant.side !== 'players') return state;
  if (!participant.awaitingRoll) return state;
  if (!validateDiceResults(participant.actionDiceProfile, values)) {
    throw new Error('Los resultados no coinciden con el perfil de dados de la clase.');
  }
  const round = Math.max(1, asInteger(state.round, 1));
  const source = options.source === 'manual' ? 'manual' : 'digital';
  const actionDice = createPool(tokenId, participant.actionDiceProfile, values, round, source);
  const isInitiativeRoll = participant.initiative === null || participant.initiative === undefined || !Number.isFinite(Number(participant.initiative));
  const initiative = isInitiativeRoll ? participant.initiativeBase + Math.max(...values.map(Number)) : participant.initiative;
  const next = _objectSpread2(_objectSpread2({}, state), {}, {
    updatedAt: options.now || Date.now(),
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2(_objectSpread2({}, participant), {}, {
        initiative
      }, participant.rulesSystem === 'campaign' && isInitiativeRoll ? {
        initiativeDice: [...values].sort((a, b) => b - a)
      } : {}), {}, {
        actionDice,
        awaitingRoll: false
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: "".concat(tokenId, "-").concat(round, "-").concat(options.now || Date.now()),
      type: isInitiativeRoll ? 'initiative-and-actions' : 'round-actions',
      tokenId,
      round,
      values: values.map(Number),
      source
    }]
  });
  return allPlayersReady(next.participants) ? openTurnPhase(next, options.random) : next;
};
const rollParticipantActionDice = function (state, tokenId) {
  var _state$participants6;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants6 = state.participants) === null || _state$participants6 === void 0 ? void 0 : _state$participants6[tokenId];
  if (!participant) return state;
  return submitActionDice(state, tokenId, rollDiceProfile(participant.actionDiceProfile, options.random), _objectSpread2(_objectSpread2({}, options), {}, {
    source: 'digital'
  }));
};
const setActionDieStatus = function (state, tokenId, dieId, status) {
  var _state$participants7;
  let options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  if (!ACTION_DIE_STATUSES.includes(status)) return state;
  const participant = state === null || state === void 0 ? void 0 : (_state$participants7 = state.participants) === null || _state$participants7 === void 0 ? void 0 : _state$participants7[tokenId];
  if (!participant) return state;
  return _objectSpread2(_objectSpread2({}, state), {}, {
    updatedAt: options.now || Date.now(),
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        actionDice: participant.actionDice.map(die => die.id === dieId ? _objectSpread2(_objectSpread2({}, die), {}, {
          status
        }) : die)
      })
    })
  });
};
const consumeItemUseResource = function (state, tokenId) {
  var _state$participants8, _participant$actionDi;
  let resource = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants8 = state.participants) === null || _state$participants8 === void 0 ? void 0 : _state$participants8[tokenId];
  if (!participant || resource.status !== 'available') return state;
  if (resource.kind === 'enemy-action') {
    var _participant$enemyAct;
    if (participant.side !== 'enemies' || resource.actionId !== 'attack' || !((_participant$enemyAct = participant.enemyActions) !== null && _participant$enemyAct !== void 0 && _participant$enemyAct.some(action => action.id === 'attack' && action.status === 'available'))) return state;
    return setEnemyActionStatus(state, tokenId, 'attack', 'spent', options);
  }
  if (resource.kind === 'enemy-movement') {
    var _participant$enemyAct2;
    const runtime = participant.movementRuntime;
    if (participant.side !== 'enemies' || resource.actionId !== 'movement' || !((_participant$enemyAct2 = participant.enemyActions) !== null && _participant$enemyAct2 !== void 0 && _participant$enemyAct2.some(action => action.id === 'movement' && action.status === 'available')) || getMovementAllowance(participant) <= Number((runtime === null || runtime === void 0 ? void 0 : runtime.spent) || 0)) return state;
    const next = setEnemyActionStatus(state, tokenId, 'movement', 'spent', options);
    return _objectSpread2(_objectSpread2({}, next), {}, {
      participants: _objectSpread2(_objectSpread2({}, next.participants), {}, {
        [tokenId]: _objectSpread2(_objectSpread2({}, next.participants[tokenId]), {}, {
          movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
            spent: getMovementAllowance(participant),
            history: []
          })
        })
      })
    });
  }
  if (resource.kind === 'manual-threat') {
    if (participant.side !== 'enemies' || !DIE_SIDES.includes(resource.sides)) return state;
    return _objectSpread2(_objectSpread2({}, state), {}, {
      updatedAt: options.now || Date.now(),
      history: [...(state.history || []).slice(-39), {
        id: "item-threat-".concat(tokenId, "-").concat(options.now || Date.now()),
        type: 'item-use-resource',
        tokenId,
        kind: 'manual-threat',
        sides: resource.sides,
        timestamp: options.now || Date.now()
      }]
    });
  }
  if (resource.kind === 'threat-die') {
    if (participant.side !== 'enemies' || participant.threatValue === null || participant.threatValue === undefined) {
      return state;
    }
    return _objectSpread2(_objectSpread2({}, state), {}, {
      updatedAt: options.now || Date.now(),
      participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
        [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
          threatValue: null
        })
      })
    });
  }
  if (resource.kind !== 'action-die') return state;
  const die = (_participant$actionDi = participant.actionDice) === null || _participant$actionDi === void 0 ? void 0 : _participant$actionDi.find(candidate => candidate.id === resource.id);
  if (!die || die.status !== 'available') return state;
  return setActionDieStatus(state, tokenId, resource.id, 'spent', options);
};
const setEnemyActionStatus = function (state, tokenId, actionId, status) {
  var _state$participants9;
  let options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants9 = state.participants) === null || _state$participants9 === void 0 ? void 0 : _state$participants9[tokenId];
  if (!participant) return state;
  const currentActions = participant.enemyActions || defaultEnemyActions();
  return _objectSpread2(_objectSpread2({}, state), {}, {
    updatedAt: options.now || Date.now(),
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        enemyActions: currentActions.map(action => action.id === actionId ? _objectSpread2(_objectSpread2({}, action), {}, {
          status
        }) : action)
      })
    })
  });
};
const markParticipantActed = function (state, tokenId) {
  var _state$blocks2, _state$participants0;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (state !== null && state !== void 0 && state.arcaneChain) return state;
  const block = state === null || state === void 0 ? void 0 : (_state$blocks2 = state.blocks) === null || _state$blocks2 === void 0 ? void 0 : _state$blocks2[state.activeBlockIndex];
  if (!block || !block.memberIds.includes(tokenId) || block.actedIds.includes(tokenId)) return state;
  const blocks = state.blocks.map((candidate, index) => index === state.activeBlockIndex ? _objectSpread2(_objectSpread2({}, candidate), {}, {
    actedIds: [...candidate.actedIds, tokenId]
  }) : candidate);
  const participant = (_state$participants0 = state.participants) === null || _state$participants0 === void 0 ? void 0 : _state$participants0[tokenId];
  const hasteTurnBonus = Number(participant === null || participant === void 0 ? void 0 : participant.hasteTurnBonus) || 0;
  const participants = hasteTurnBonus ? _objectSpread2(_objectSpread2({}, state.participants), {}, {
    [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
      hasteTurnBonus: 0,
      movementRuntime: _objectSpread2(_objectSpread2({}, participant.movementRuntime), {}, {
        sprintBonus: Math.max(0, participant.movementRuntime.sprintBonus - hasteTurnBonus),
        spent: Math.min(participant.movementRuntime.spent, getMovementAllowance(participant) - hasteTurnBonus)
      })
    })
  }) : state.participants;
  const completed = blocks[state.activeBlockIndex].actedIds.length >= block.memberIds.length;
  let nextBlockIndex = state.activeBlockIndex;
  if (completed) {
    nextBlockIndex += 1;
    // A reopened activation may sit before blocks already completed this round.
    while (nextBlockIndex < blocks.length && blocks[nextBlockIndex].memberIds.every(id => blocks[nextBlockIndex].actedIds.includes(id))) nextBlockIndex += 1;
  }
  return activateCampaignDefense(_objectSpread2(_objectSpread2({}, state), {}, {
    updatedAt: options.now || Date.now(),
    blocks,
    participants,
    activeBlockIndex: nextBlockIndex
  }));
};
const undoLastActivation = function (state) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const blocks = ((state === null || state === void 0 ? void 0 : state.blocks) || []).map(block => _objectSpread2(_objectSpread2({}, block), {}, {
    actedIds: [...block.actedIds]
  }));
  let index = Math.min(state.activeBlockIndex, Math.max(0, blocks.length - 1));
  if (state.activeBlockIndex >= blocks.length && blocks.length > 0) index = blocks.length - 1;
  while (index >= 0 && blocks[index].actedIds.length === 0) index -= 1;
  if (index < 0) return state;
  blocks[index].actedIds.pop();
  return _objectSpread2(_objectSpread2({}, state), {}, {
    blocks,
    activeBlockIndex: index,
    updatedAt: options.now || Date.now()
  });
};
const undoParticipantActivation = function (state, tokenId) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if ((state === null || state === void 0 ? void 0 : state.status) !== 'active' || (state === null || state === void 0 ? void 0 : state.roundPhase) !== 'turns' || state.pendingAttack || state.explosiveBlast || state.arcaneChain) return state;
  const blocks = ((state === null || state === void 0 ? void 0 : state.blocks) || []).map(block => _objectSpread2(_objectSpread2({}, block), {}, {
    actedIds: [...(block.actedIds || [])]
  }));
  const blockIndex = blocks.findIndex(block => block.actedIds.includes(tokenId));
  if (blockIndex < 0) return state;
  blocks[blockIndex].actedIds = blocks[blockIndex].actedIds.filter(id => id !== tokenId);
  return _objectSpread2(_objectSpread2({}, state), {}, {
    blocks,
    activeBlockIndex: blockIndex,
    updatedAt: options.now || Date.now(),
    history: [...(state.history || []).slice(-39), {
      id: "reopen-".concat(tokenId, "-").concat(options.now || Date.now()),
      type: 'activation-reopened',
      tokenId,
      round: state.round,
      timestamp: options.now || Date.now()
    }]
  });
};
const spendActionDieForSprint = function (state, tokenId, dieId) {
  var _state$participants1, _state$blocks3, _participant$actionDi2, _activeBlock$memberId, _activeBlock$actedIds;
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants1 = state.participants) === null || _state$participants1 === void 0 ? void 0 : _state$participants1[tokenId];
  const activeBlock = state === null || state === void 0 ? void 0 : (_state$blocks3 = state.blocks) === null || _state$blocks3 === void 0 ? void 0 : _state$blocks3[state.activeBlockIndex];
  const runtime = participant === null || participant === void 0 ? void 0 : participant.movementRuntime;
  const die = participant === null || participant === void 0 ? void 0 : (_participant$actionDi2 = participant.actionDice) === null || _participant$actionDi2 === void 0 ? void 0 : _participant$actionDi2.find(candidate => candidate.id === dieId);
  const spentSprintDieIds = Array.isArray(runtime === null || runtime === void 0 ? void 0 : runtime.sprintDieIds) ? runtime.sprintDieIds : [runtime === null || runtime === void 0 ? void 0 : runtime.sprintDieId].filter(Boolean);
  const canActNow = (state === null || state === void 0 ? void 0 : state.status) === 'active' && (state === null || state === void 0 ? void 0 : state.roundPhase) === 'turns' && (activeBlock === null || activeBlock === void 0 ? void 0 : (_activeBlock$memberId = activeBlock.memberIds) === null || _activeBlock$memberId === void 0 ? void 0 : _activeBlock$memberId.includes(tokenId)) && !(activeBlock !== null && activeBlock !== void 0 && (_activeBlock$actedIds = activeBlock.actedIds) !== null && _activeBlock$actedIds !== void 0 && _activeBlock$actedIds.includes(tokenId));
  if (!participant || participant.side !== 'players' || !runtime || !canActNow || spentSprintDieIds.includes(dieId) || !die || die.status !== 'available') return state;
  const sprintBonus = Math.max(0, asInteger(die.value, 0));
  if (sprintBonus <= 0) return state;
  const now = options.now || Date.now();
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        actionDice: participant.actionDice.map(candidate => candidate.id === dieId ? _objectSpread2(_objectSpread2({}, candidate), {}, {
          status: 'spent'
        }) : candidate),
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          sprintBonus: Math.max(0, Number(runtime.sprintBonus) || 0) + sprintBonus,
          sprintDieId: dieId,
          sprintDieIds: [...spentSprintDieIds, dieId]
        })
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: "sprint-".concat(tokenId, "-").concat(now),
      type: 'sprint-activated',
      tokenId,
      dieId,
      die: die.die,
      value: sprintBonus,
      round: state.round,
      timestamp: now
    }],
    updatedAt: now
  });
};
const rechargeEnemyMovementWithAttack = function (state, tokenId) {
  var _state$participants10, _state$blocks4, _activeBlock$memberId2, _activeBlock$actedIds2;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants10 = state.participants) === null || _state$participants10 === void 0 ? void 0 : _state$participants10[tokenId];
  const activeBlock = state === null || state === void 0 ? void 0 : (_state$blocks4 = state.blocks) === null || _state$blocks4 === void 0 ? void 0 : _state$blocks4[state.activeBlockIndex];
  const runtime = participant === null || participant === void 0 ? void 0 : participant.movementRuntime;
  const actions = (participant === null || participant === void 0 ? void 0 : participant.enemyActions) || defaultEnemyActions();
  const attackAction = actions.find(action => action.id === 'attack');
  const canActNow = (state === null || state === void 0 ? void 0 : state.status) === 'active' && (state === null || state === void 0 ? void 0 : state.roundPhase) === 'turns' && (activeBlock === null || activeBlock === void 0 ? void 0 : (_activeBlock$memberId2 = activeBlock.memberIds) === null || _activeBlock$memberId2 === void 0 ? void 0 : _activeBlock$memberId2.includes(tokenId)) && !(activeBlock !== null && activeBlock !== void 0 && (_activeBlock$actedIds2 = activeBlock.actedIds) !== null && _activeBlock$actedIds2 !== void 0 && _activeBlock$actedIds2.includes(tokenId));
  const baseAllowance = runtime ? Math.max(0, (Number(runtime.base) || 0) + (Number(runtime.modifier) || 0)) : 0;
  if (!participant || participant.side !== 'enemies' || !runtime || !canActNow || !attackAction || attackAction.status === 'spent' || getAvailableMovement(participant) >= baseAllowance) return state;
  const now = options.now || Date.now();
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        enemyActions: actions.map(action => action.id === 'attack' ? _objectSpread2(_objectSpread2({}, action), {}, {
          status: 'spent'
        }) : action),
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          spent: 0,
          sprintBonus: runtime.bleedingForfeit ? baseAllowance : 0,
          sprintDieId: null,
          sprintDieIds: []
        })
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: "enemy-sprint-".concat(tokenId, "-").concat(now),
      type: 'enemy-sprint-activated',
      tokenId,
      movementRestored: baseAllowance,
      spentActionId: 'attack',
      actor: options.actor || 'Master',
      timestamp: now
    }],
    updatedAt: now
  });
};
const setParticipantMovementModifier = function (state, tokenId, modifier) {
  var _state$participants11;
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants11 = state.participants) === null || _state$participants11 === void 0 ? void 0 : _state$participants11[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: []
  };
  const nextModifier = asInteger(modifier, 0);
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          modifier: nextModifier
        })
      })
    }),
    updatedAt: options.now || Date.now()
  });
};
const setParticipantMovementResource = function (state, tokenId) {
  var _state$participants12, _runtime$statMax, _runtime$statMax2;
  let resource = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants12 = state.participants) === null || _state$participants12 === void 0 ? void 0 : _state$participants12[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: []
  };
  const field = resource.field === 'max' ? 'max' : 'current';
  const modifier = Number(runtime.modifier) || 0;
  const sprintBonus = Math.max(0, Number(runtime.sprintBonus) || 0);
  const transientBonus = modifier + sprintBonus;
  const previousBaseAllowance = Math.max(0, (Number(runtime.base) || 0) + modifier);
  const previousSpent = Math.max(0, Number(runtime.spent) || 0);
  const sprintSpent = Math.min(sprintBonus, Math.max(0, previousSpent - previousBaseAllowance));
  const sprintRemaining = Math.max(0, sprintBonus - sprintSpent);
  const requestedMax = Math.max(0, asInteger(resource.max, (_runtime$statMax = runtime.statMax) !== null && _runtime$statMax !== void 0 ? _runtime$statMax : runtime.base));
  const nextBase = field === 'max' ? Math.max(0, requestedMax - transientBonus) : Math.max(0, Number(runtime.base) || 0);
  const nextStatMax = field === 'max' ? nextBase : (_runtime$statMax2 = runtime.statMax) !== null && _runtime$statMax2 !== void 0 ? _runtime$statMax2 : nextBase;
  const nextAllowance = Math.max(0, nextBase + transientBonus);
  const nextBaseAllowance = Math.max(0, nextBase + modifier);
  const maximumRechargeable = Math.min(nextAllowance, nextBaseAllowance + sprintRemaining);
  const requestedCurrent = Math.max(0, asInteger(resource.current, getAvailableMovement(participant)));
  const nextCurrent = Math.min(requestedCurrent, maximumRechargeable);
  const nextSpent = Math.max(0, nextAllowance - nextCurrent);
  if (nextBase === (Number(runtime.base) || 0) && nextStatMax === (Number(runtime.statMax) || 0) && nextSpent === (Number(runtime.spent) || 0)) return state;
  const now = options.now || Date.now();
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          base: nextBase,
          statMax: nextStatMax,
          spent: nextSpent
        })
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: "movement-adjusted-".concat(tokenId, "-").concat(now),
      type: 'movement-resource-adjusted',
      tokenId,
      field,
      previousRemaining: getAvailableMovement(participant),
      remaining: nextCurrent,
      allowance: nextAllowance,
      actor: options.actor || null,
      timestamp: now
    }],
    updatedAt: now
  });
};
const recordParticipantMovement = function (state, tokenId, _ref14) {
  var _state$participants13, _participant$defensiv2, _participant$defensiv3;
  let {
    from,
    to,
    cost = 0,
    isExceptional = false,
    actor = null
  } = _ref14;
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants13 = state.participants) === null || _state$participants13 === void 0 ? void 0 : _state$participants13[tokenId];
  if (!participant) return state;
  const runtime = participant.movementRuntime || {
    base: getMovementBase(participant),
    statMax: getMovementStatMax(participant),
    modifier: 0,
    spent: 0,
    sprintBonus: 0,
    sprintDieId: null,
    sprintDieIds: [],
    history: []
  };
  const numericCost = Math.max(0, asInteger(cost, 0));
  const effectiveCost = isExceptional ? 0 : numericCost;
  const defensiveRemaining = Math.max(0, Number((_participant$defensiv2 = participant.defensiveReposition) === null || _participant$defensiv2 === void 0 ? void 0 : _participant$defensiv2.remaining) || 0);
  const usesDefensiveReposition = defensiveRemaining > 0 && !isExceptional;
  const entry = {
    id: "move-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 6)),
    from: {
      x: Number(from === null || from === void 0 ? void 0 : from.x) || 0,
      y: Number(from === null || from === void 0 ? void 0 : from.y) || 0
    },
    to: {
      x: Number(to === null || to === void 0 ? void 0 : to.x) || 0,
      y: Number(to === null || to === void 0 ? void 0 : to.y) || 0
    },
    cost: effectiveCost,
    isExceptional: Boolean(isExceptional),
    defensiveReposition: usesDefensiveReposition,
    actor: actor || participant.name || 'Desconocido',
    timestamp: options.now || Date.now()
  };
  const nextHistory = [...(runtime.history || []), entry];
  const nextSpent = usesDefensiveReposition ? Math.max(0, Number(runtime.spent) || 0) : Math.max(0, (Number(runtime.spent) || 0) + effectiveCost);
  return _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        defensiveReposition: usesDefensiveReposition ? _objectSpread2(_objectSpread2({}, participant.defensiveReposition), {}, {
          remaining: Math.max(0, defensiveRemaining - effectiveCost)
        }) : (_participant$defensiv3 = participant.defensiveReposition) !== null && _participant$defensiv3 !== void 0 ? _participant$defensiv3 : null,
        enemyActions: participant.side === 'enemies' && effectiveCost > 0 && !usesDefensiveReposition ? (participant.enemyActions || defaultEnemyActions()).map(action => action.id === 'movement' ? _objectSpread2(_objectSpread2({}, action), {}, {
          status: 'spent'
        }) : action) : participant.enemyActions,
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          spent: nextSpent,
          history: nextHistory
        })
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: entry.id,
      type: 'movement-confirmed',
      tokenId,
      participantName: participant.name,
      cost: effectiveCost,
      isExceptional: entry.isExceptional,
      actor: entry.actor,
      timestamp: entry.timestamp
    }],
    updatedAt: options.now || Date.now()
  });
};
const undoParticipantMovement = function (state, tokenId) {
  var _state$participants14, _participant$defensiv4, _participant$defensiv5;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const participant = state === null || state === void 0 ? void 0 : (_state$participants14 = state.participants) === null || _state$participants14 === void 0 ? void 0 : _state$participants14[tokenId];
  if (!participant) return {
    state,
    undoneEntry: null
  };
  const runtime = participant.movementRuntime;
  if (!runtime || !Array.isArray(runtime.history) || runtime.history.length === 0) {
    return {
      state,
      undoneEntry: null
    };
  }
  const lastEntry = runtime.history[runtime.history.length - 1];
  const nextHistory = runtime.history.slice(0, -1);
  const nextSpent = lastEntry.defensiveReposition ? Math.max(0, Number(runtime.spent) || 0) : Math.max(0, (Number(runtime.spent) || 0) - (Number(lastEntry.cost) || 0));
  const nextState = _objectSpread2(_objectSpread2({}, state), {}, {
    participants: _objectSpread2(_objectSpread2({}, state.participants), {}, {
      [tokenId]: _objectSpread2(_objectSpread2({}, participant), {}, {
        defensiveReposition: lastEntry.defensiveReposition ? _objectSpread2(_objectSpread2({}, participant.defensiveReposition || {}), {}, {
          remaining: Math.max(0, Number((_participant$defensiv4 = participant.defensiveReposition) === null || _participant$defensiv4 === void 0 ? void 0 : _participant$defensiv4.remaining) || 0) + (Number(lastEntry.cost) || 0),
          ignoresDuelExit: true
        }) : (_participant$defensiv5 = participant.defensiveReposition) !== null && _participant$defensiv5 !== void 0 ? _participant$defensiv5 : null,
        enemyActions: participant.side === 'enemies' && nextHistory.length === 0 ? (participant.enemyActions || defaultEnemyActions()).map(action => action.id === 'movement' ? _objectSpread2(_objectSpread2({}, action), {}, {
          status: 'available'
        }) : action) : participant.enemyActions,
        movementRuntime: _objectSpread2(_objectSpread2({}, runtime), {}, {
          spent: nextSpent,
          history: nextHistory
        })
      })
    }),
    history: [...(state.history || []).slice(-39), {
      id: "undo-".concat(Date.now()),
      type: 'movement-undone',
      tokenId,
      participantName: participant.name,
      restoredPosition: lastEntry.from,
      refundedCost: lastEntry.cost,
      timestamp: options.now || Date.now()
    }],
    updatedAt: options.now || Date.now()
  });
  return {
    state: nextState,
    undoneEntry: lastEntry
  };
};
const startNextRound = function (state) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (state !== null && state !== void 0 && state.pendingAttack || state !== null && state !== void 0 && state.explosiveBlast || state !== null && state !== void 0 && state.arcaneChain) return state;
  const round = Math.max(1, asInteger(state === null || state === void 0 ? void 0 : state.round, 1)) + 1;
  const participants = Object.fromEntries(Object.entries((state === null || state === void 0 ? void 0 : state.participants) || {}).map(_ref15 => {
    var _participant$movement, _participant$movement2, _participant$movement3, _participant$movement4, _participant$movement5, _participant$movement6;
    let [id, participant] = _ref15;
    return [id, participant.side === 'players' ? _objectSpread2(_objectSpread2(_objectSpread2({}, participant), participant.hasteTurnBonus ? {
      hasteTurnBonus: 0
    } : {}), {}, {
      actionDice: [],
      awaitingRoll: participant.actionDiceProfile.length > 0,
      movementRuntime: {
        base: ((_participant$movement = participant.movementRuntime) === null || _participant$movement === void 0 ? void 0 : _participant$movement.base) || getMovementBase(participant),
        statMax: ((_participant$movement2 = participant.movementRuntime) === null || _participant$movement2 === void 0 ? void 0 : _participant$movement2.statMax) || ((_participant$movement3 = participant.movementRuntime) === null || _participant$movement3 === void 0 ? void 0 : _participant$movement3.base) || getMovementStatMax(participant),
        modifier: 0,
        spent: 0,
        sprintBonus: 0,
        sprintDieId: null,
        sprintDieIds: [],
        history: []
      }
    }) : _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, participant), participant.hasteTurnBonus ? {
      hasteTurnBonus: 0
    } : {}), {}, {
      threatValue: null,
      enemyActions: participant.rulesSystem === 'campaign' ? defaultEnemyActions(true).map(action => {
        var _participant$enemyAct3;
        return action.id === 'defense' ? ((_participant$enemyAct3 = participant.enemyActions) === null || _participant$enemyAct3 === void 0 ? void 0 : _participant$enemyAct3.find(old => old.id === 'defense')) || action : action;
      }) : defaultEnemyActions()
    }, participant.rulesSystem === 'campaign' ? {
      defenseRefreshed: false
    } : {}), {}, {
      movementRuntime: {
        base: ((_participant$movement4 = participant.movementRuntime) === null || _participant$movement4 === void 0 ? void 0 : _participant$movement4.base) || getMovementBase(participant),
        statMax: ((_participant$movement5 = participant.movementRuntime) === null || _participant$movement5 === void 0 ? void 0 : _participant$movement5.statMax) || ((_participant$movement6 = participant.movementRuntime) === null || _participant$movement6 === void 0 ? void 0 : _participant$movement6.base) || getMovementStatMax(participant),
        modifier: 0,
        spent: 0,
        sprintBonus: 0,
        sprintDieId: null,
        sprintDieIds: [],
        history: []
      }
    })];
  }));
  const next = _objectSpread2(_objectSpread2({}, state), {}, {
    status: 'active',
    round,
    roundPhase: 'rolling',
    participants,
    blocks: [],
    activeBlockIndex: 0,
    pendingAttack: null,
    updatedAt: options.now || Date.now()
  });
  return allPlayersReady(participants) ? openTurnPhase(next, options.random) : next;
};
const finishCanvasCombat = function (state) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return _objectSpread2(_objectSpread2({}, state), {}, {
    status: 'finished',
    roundPhase: 'finished',
    finishedAt: options.now || Date.now(),
    pendingAttack: null,
    explosiveBlast: null,
    arcaneChain: null,
    queuedFireBursts: [],
    updatedAt: options.now || Date.now()
  });
};
const pruneCombatState = function (state) {
  var _state$blocks5, _state$blocks5$state$;
  let tokens = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  if (!state || !state.participants) return state;
  const tokenIds = new Set((tokens || []).filter(isCombatParticipant).map(t => t.id));
  const currentParticipants = state.participants;
  const currentIds = Object.keys(currentParticipants);
  const validIds = currentIds.filter(id => tokenIds.has(id));
  const tokenMap = new Map(tokens.map(token => [token.id, token]));
  let teamsChanged = false;
  const nextParticipants = Object.fromEntries(validIds.map(id => {
    var _tokenMap$get;
    const participant = currentParticipants[id];
    if (state.rulesSystem !== 'campaign' && participant.rulesSystem !== 'campaign') return [id, participant];
    const initiativeTeamId = legacyCombatRules_normalizeCombatSideKey(((_tokenMap$get = tokenMap.get(id)) === null || _tokenMap$get === void 0 ? void 0 : _tokenMap$get.teamId) || '');
    if (participant.initiativeTeamId === initiativeTeamId) return [id, participant];
    teamsChanged = true;
    return [id, _objectSpread2(_objectSpread2({}, participant), {}, {
      initiativeTeamId
    })];
  }));
  const hasOrphanedPendingAttack = Boolean(state.pendingAttack && (!tokenIds.has(state.pendingAttack.attackerId) || !tokenIds.has(state.pendingAttack.targetId)));
  if (validIds.length === currentIds.length && !hasOrphanedPendingAttack && !teamsChanged) {
    return state;
  }
  const nextBlocks = buildInitiativeBlocks(nextParticipants);
  const actedIds = new Set((state.blocks || []).flatMap(block => block.actedIds || []));
  nextBlocks.forEach(block => {
    block.actedIds = block.memberIds.filter(id => actedIds.has(id));
  });
  const activeIds = ((_state$blocks5 = state.blocks) === null || _state$blocks5 === void 0 ? void 0 : (_state$blocks5$state$ = _state$blocks5[state.activeBlockIndex]) === null || _state$blocks5$state$ === void 0 ? void 0 : _state$blocks5$state$.memberIds.filter(id => !actedIds.has(id))) || [];
  let activeBlockIndex = nextBlocks.findIndex(block => block.memberIds.some(id => activeIds.includes(id)));
  if (activeBlockIndex < 0) activeBlockIndex = nextBlocks.findIndex(block => block.memberIds.some(id => !actedIds.has(id)));
  if (activeBlockIndex < 0) activeBlockIndex = nextBlocks.length;
  const pruned = _objectSpread2(_objectSpread2({}, state), {}, {
    participants: nextParticipants,
    blocks: nextBlocks,
    activeBlockIndex,
    pendingAttack: hasOrphanedPendingAttack ? null : state.pendingAttack,
    explosiveBlast: state.explosiveBlast && tokenIds.has(state.explosiveBlast.sourceTokenId) ? state.explosiveBlast : null,
    arcaneChain: state.arcaneChain && tokenIds.has(state.arcaneChain.sourceTokenId) ? state.arcaneChain : null,
    updatedAt: Date.now()
  });
  return hasOrphanedPendingAttack && pruned.explosiveBlast ? continueCanvasExplosiveBlast(pruned, state.pendingAttack, tokens) : pruned;
};
;// ./src/features/tactical-shared/potionBuffs.js


const _excluded = (/* unused pure expression or super */ null && (["potionBase", "potionBonus"]));
const getTemporaryLife = token => {
  var _token$stats, _token$stats$vidaTemp;
  return Math.max(0, Number(token === null || token === void 0 ? void 0 : (_token$stats = token.stats) === null || _token$stats === void 0 ? void 0 : (_token$stats$vidaTemp = _token$stats.vidaTemporal) === null || _token$stats$vidaTemp === void 0 ? void 0 : _token$stats$vidaTemp.current) || 0);
};
const describeLifeLoss = resolution => {
  var _resolution$normalLif;
  const temporary = Number(resolution === null || resolution === void 0 ? void 0 : resolution.temporaryLifeLost) || 0;
  const normal = Number((_resolution$normalLif = resolution === null || resolution === void 0 ? void 0 : resolution.normalLifeLost) !== null && _resolution$normalLif !== void 0 ? _resolution$normalLif : resolution === null || resolution === void 0 ? void 0 : resolution.lifeLost) || 0;
  const blocks = count => "".concat(count, " ").concat(count === 1 ? 'bloque' : 'bloques');
  return [temporary > 0 ? "".concat(blocks(temporary), " de Vida temporal") : null, normal > 0 ? "".concat(blocks(normal), " de Vida") : null].filter(Boolean).join(' y ') || '0 bloques de Vida';
};
const getBuffPotionBlockReason = token => {
  var _token$stats2, _token$stats2$vida;
  return Number(token === null || token === void 0 ? void 0 : (_token$stats2 = token.stats) === null || _token$stats2 === void 0 ? void 0 : (_token$stats2$vida = _token$stats2.vida) === null || _token$stats2$vida === void 0 ? void 0 : _token$stats2$vida.current) > 0 ? null : 'Necesitas estar en pie para beber la poción.';
};
const applyVitalityPotion = token => _objectSpread(_objectSpread({}, token), {}, {
  stats: _objectSpread(_objectSpread({}, token.stats), {}, {
    vidaTemporal: {
      current: 2,
      max: 2,
      source: 'vitality-potion'
    }
  })
});
const applyHastePotion = (token, combat) => {
  var _token$stats3;
  const participant = combat.participants[token.id];
  const runtime = participant.movementRuntime;
  const previousBonus = Number(participant.hasteBonus) || 0;
  const bonus = 1;
  const movementRuntime = _objectSpread(_objectSpread({}, runtime), {}, {
    base: runtime.base + bonus - previousBonus,
    sprintBonus: (Number(runtime.sprintBonus) || 0) + 4
  });
  const nextParticipant = _objectSpread(_objectSpread({}, participant), {}, {
    hasteBonus: bonus,
    hasteTurnBonus: (Number(participant.hasteTurnBonus) || 0) + 4,
    movementRuntime,
    enemyActions: (participant.enemyActions || []).map(action => action.id === 'movement' ? _objectSpread(_objectSpread({}, action), {}, {
      status: 'available'
    }) : action)
  });
  const allowance = movementRuntime.base + (Number(movementRuntime.modifier) || 0) + movementRuntime.sprintBonus;
  return {
    combat: _objectSpread(_objectSpread({}, combat), {}, {
      participants: _objectSpread(_objectSpread({}, combat.participants), {}, {
        [token.id]: nextParticipant
      })
    }),
    token: _objectSpread(_objectSpread({}, token), {}, {
      stats: _objectSpread(_objectSpread({}, token.stats), {}, {
        movimiento: _objectSpread(_objectSpread({}, (_token$stats3 = token.stats) === null || _token$stats3 === void 0 ? void 0 : _token$stats3.movimiento), {}, {
          potionBase: runtime.base - previousBonus,
          potionBonus: bonus,
          current: Math.max(0, allowance - (Number(runtime.spent) || 0)),
          max: Math.max(Number(runtime.statMax) || 0, allowance)
        })
      })
    })
  };
};
const clearPotionBuffs = token => {
  var _token$stats4, _token$stats5, _token$stats5$movimie, _stats$movimiento;
  if (!((_token$stats4 = token.stats) !== null && _token$stats4 !== void 0 && _token$stats4.vidaTemporal) && !((_token$stats5 = token.stats) !== null && _token$stats5 !== void 0 && (_token$stats5$movimie = _token$stats5.movimiento) !== null && _token$stats5$movimie !== void 0 && _token$stats5$movimie.potionBonus)) return token;
  const stats = _objectSpread({}, token.stats);
  delete stats.vidaTemporal;
  if ((_stats$movimiento = stats.movimiento) !== null && _stats$movimiento !== void 0 && _stats$movimiento.potionBonus) {
    const _stats$movimiento2 = stats.movimiento,
      {
        potionBase,
        potionBonus
      } = _stats$movimiento2,
      movement = _objectWithoutProperties(_stats$movimiento2, _excluded);
    stats.movimiento = _objectSpread(_objectSpread({}, movement), {}, {
      current: potionBase,
      max: potionBase
    });
  }
  return _objectSpread(_objectSpread({}, token), {}, {
    stats
  });
};
;// ./src/utils/arcaneBarrierStatus.js


const arcaneBarrierStatus_excluded = (/* unused pure expression or super */ null && (["arcaneBarrier"]));
const ARCANE_BARRIER_STATUS_ID = 'barrera';
const statusIds = token => Array.isArray(token === null || token === void 0 ? void 0 : token.status) ? token.status : String((token === null || token === void 0 ? void 0 : token.status) || '').split(',').map(id => id.trim()).filter(Boolean);
const isBarrier = id => String(id || '').split('|')[0].trim().toLowerCase() === ARCANE_BARRIER_STATUS_ID;
const hasBarrierMetadata = token => {
  var _token$arcaneBarrier;
  return (token === null || token === void 0 ? void 0 : (_token$arcaneBarrier = token.arcaneBarrier) === null || _token$arcaneBarrier === void 0 ? void 0 : _token$arcaneBarrier.spellId) === 'runic-barrier' && token.arcaneBarrier.expires === 'combat-end';
};

// Scene-local state: its bonus never changes base CD or the adventure sheet.
// Metadata-only barriers remain supported for scenes saved before the state existed.
const hasArcaneBarrier = token => hasBarrierMetadata(token) || statusIds(token).some(isBarrier);
const getArcaneBarrierBonus = token => hasArcaneBarrier(token) ? 1 : 0;
const getArcaneBarrierProtections = token => {
  var _token$arcaneBarrier2;
  return hasArcaneBarrier(token) ? ((token === null || token === void 0 ? void 0 : (_token$arcaneBarrier2 = token.arcaneBarrier) === null || _token$arcaneBarrier2 === void 0 ? void 0 : _token$arcaneBarrier2.negatedTraits) || []).filter(trait => ['critico', 'venenosa', 'conmocion'].includes(trait)) : [];
};
const getArcaneBarrierStatusIds = token => [...statusIds(token).filter(id => !isBarrier(id)), ...(hasArcaneBarrier(token) ? [ARCANE_BARRIER_STATUS_ID] : [])];
const withoutArcaneBarrierStatus = statuses => statusIds({
  status: statuses
}).filter(id => !isBarrier(id));
const clearArcaneBarrier = token => {
  if (!hasArcaneBarrier(token)) return token;
  const {
      arcaneBarrier
    } = token,
    rest = _objectWithoutProperties(token, arcaneBarrierStatus_excluded);
  return _objectSpread(_objectSpread({}, rest), token.status !== undefined ? {
    status: withoutArcaneBarrierStatus(token.status)
  } : {});
};
const applyArcaneBarrier = (token, _ref) => {
  let {
    castId,
    sourceTokenId,
    catalystId,
    protections = [],
    now
  } = _ref;
  return _objectSpread(_objectSpread({}, token), {}, {
    status: [...withoutArcaneBarrierStatus(token.status), ARCANE_BARRIER_STATUS_ID],
    arcaneBarrier: {
      id: castId,
      spellId: 'runic-barrier',
      sourceTokenId,
      catalystId,
      negatedTraits: [...new Set(protections)],
      createdAt: now,
      expires: 'combat-end'
    }
  });
};

// All Canvas state editors use this patch, so a manual removal cannot leave
// an invisible protection behind. Unrelated updates keep the existing barrier.
const reconcileArcaneBarrierUpdate = function (token, updates) {
  let now = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Date.now();
  if (!token || !updates) return updates;
  const editsStatus = Object.prototype.hasOwnProperty.call(updates, 'status');
  const editsBarrier = Object.prototype.hasOwnProperty.call(updates, 'arcaneBarrier');
  if (!editsStatus && !editsBarrier) return updates;
  const next = _objectSpread(_objectSpread({}, token), updates);
  if (!hasArcaneBarrier(token) && !hasArcaneBarrier(next) && !editsBarrier) return updates;
  // Old scenes have no status entry yet. Editing another condition must migrate
  // that protection, not revoke it; explicit metadata removal still revokes it.
  const removesStatus = editsStatus && !statusIds(next).some(isBarrier) && (statusIds(token).some(isBarrier) || !hasBarrierMetadata(token));
  if (removesStatus || editsBarrier && !hasBarrierMetadata(next)) {
    return _objectSpread(_objectSpread({}, updates), {}, {
      status: withoutArcaneBarrierStatus(next.status),
      arcaneBarrier: null
    });
  }
  if (!hasArcaneBarrier(next)) return updates;
  const arcaneBarrier = hasBarrierMetadata(next) ? next.arcaneBarrier : {
    id: "manual-barrier-".concat(token.id, "-").concat(now),
    spellId: 'runic-barrier',
    negatedTraits: [],
    createdAt: now,
    expires: 'combat-end'
  };
  return _objectSpread(_objectSpread({}, updates), {}, {
    status: getArcaneBarrierStatusIds(next),
    arcaneBarrier
  });
};
const presentArcaneBarrierImpact = (token, attackId, now) => hasArcaneBarrier(token) ? _objectSpread(_objectSpread({}, token), {}, {
  arcaneBarrier: _objectSpread(_objectSpread({}, token.arcaneBarrier || {
    id: "manual-barrier-".concat(token.id),
    spellId: 'runic-barrier',
    expires: 'combat-end',
    negatedTraits: []
  }), {}, {
    lastImpactId: attackId,
    lastImpactAt: now
  })
}) : token;
const ARCANE_BARRIER_PROTECTION_NAMES = {
  critico: 'Crítico',
  venenosa: 'Veneno',
  conmocion: 'Conmoción'
};
;// ./src/features/canvas/spells/arcaneBarrierState.js

;// ./src/features/tactical-shared/poisonRules.js

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value ? [value] : [];
const isPoisonStatus = value => normalize(typeof value === 'string' ? value : (value === null || value === void 0 ? void 0 : value.id) || (value === null || value === void 0 ? void 0 : value.name) || (value === null || value === void 0 ? void 0 : value.label)) === 'envenenado';
const isCanvasPoisoned = token => [...list(token === null || token === void 0 ? void 0 : token.status), ...list(token === null || token === void 0 ? void 0 : token.statusEffects)].some(isPoisonStatus);
const setCanvasPoison = (token, active) => _objectSpread(_objectSpread({}, token), {}, {
  status: [...list(token === null || token === void 0 ? void 0 : token.status).filter(value => !isPoisonStatus(value)), ...(active ? ['envenenado'] : [])]
}, (token === null || token === void 0 ? void 0 : token.statusEffects) !== undefined ? {
  statusEffects: list(token.statusEffects).filter(value => !isPoisonStatus(value))
} : {});
const isPoisonTrait = value => ['veneno', 'venenosa', 'venenoso', 'envenenado', 'poison', 'poisoned'].includes(normalize(value));
const applyAttackPoison = function (token, weapon, resolution) {
  var _ref, _weapon$rasgos;
  let suppressTraits = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (suppressTraits || !((resolution === null || resolution === void 0 ? void 0 : resolution.lifeLost) > 0)) return token;
  // The resolved traits already include the manual modifier and respect range/proficiency suppression.
  const traits = list((_ref = (_weapon$rasgos = weapon === null || weapon === void 0 ? void 0 : weapon.rasgos) !== null && _weapon$rasgos !== void 0 ? _weapon$rasgos : weapon === null || weapon === void 0 ? void 0 : weapon.traits) !== null && _ref !== void 0 ? _ref : weapon === null || weapon === void 0 ? void 0 : weapon.properties);
  return traits.some(isPoisonTrait) ? setCanvasPoison(token, true) : token;
};
;// ./src/features/roguelite/equipmentPool.js

const EQUIPMENT_CATEGORIES = Object.freeze(['weapons', 'armor', 'abilities', 'objects', 'accessories']);
const HAND_SLOTS = Object.freeze(['mainHand', 'offHand']);
const ROGUELITE_WEAPON_SET_COUNT = 2;
const resolveBeltSlotCount = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const storedCount = equippedItems.beltSlotCount;
  if (storedCount != null && Number.isInteger(Number(storedCount)) && Number(storedCount) >= 0) {
    return Math.min(9, Number(storedCount));
  }
  const occupiedIndices = Object.entries(equippedItems).filter(_ref => {
    let [slot, item] = _ref;
    return /^belt_\d+$/.test(slot) && item;
  }).map(_ref2 => {
    let [slot] = _ref2;
    return Number(slot.slice(5));
  });
  return Math.min(9, Math.max(3, ...occupiedIndices.map(index => index + 1)));
};
const clampWeaponSetIndex = value => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(ROGUELITE_WEAPON_SET_COUNT - 1, Math.max(0, parsed));
};
const createEmptyEquipmentPool = () => Object.fromEntries(EQUIPMENT_CATEGORIES.map(category => [category, []]));
const normalizeText = value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slugify = value => normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const resolveTraitText = function () {
  var _ref3, _ref4, _ref5, _item$traits;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const value = (_ref3 = (_ref4 = (_ref5 = (_item$traits = item.traits) !== null && _item$traits !== void 0 ? _item$traits : item.rasgos) !== null && _ref5 !== void 0 ? _ref5 : item.trait) !== null && _ref4 !== void 0 ? _ref4 : item.properties) !== null && _ref3 !== void 0 ? _ref3 : '';
  return Array.isArray(value) ? value.join(', ') : String(value || '');
};
const equipmentPool_resolveEquipmentHandsRequired = function () {
  var _ref6, _ref7, _item$handsRequired;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!item || typeof item !== 'object') return 1;
  const explicitValue = Number((_ref6 = (_ref7 = (_item$handsRequired = item.handsRequired) !== null && _item$handsRequired !== void 0 ? _item$handsRequired : item.requiredHands) !== null && _ref7 !== void 0 ? _ref7 : item.manosRequeridas) !== null && _ref6 !== void 0 ? _ref6 : item.manos);
  if (explicitValue === 2) return 2;
  if (explicitValue === 1) return 1;
  const traits = normalizeText(resolveTraitText(item));
  return /(^|\W)(dos manos|2 manos|a dos manos|two handed|two-handed)(\W|$)/.test(traits) ? 2 : 1;
};
const resolveEquippedHandOccupancy = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const mainHand = (equippedItems === null || equippedItems === void 0 ? void 0 : equippedItems.mainHand) || null;
  const offHand = (equippedItems === null || equippedItems === void 0 ? void 0 : equippedItems.offHand) || null;
  if (mainHand && equipmentPool_resolveEquipmentHandsRequired(mainHand) === 2) {
    return {
      sourceSlot: 'mainHand',
      blockedSlot: 'offHand',
      item: mainHand
    };
  }
  if (offHand && equipmentPool_resolveEquipmentHandsRequired(offHand) === 2) {
    return {
      sourceSlot: 'offHand',
      blockedSlot: 'mainHand',
      item: offHand
    };
  }
  return null;
};
const normalizeEquippedHandSlots = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const normalized = _objectSpread2({}, equippedItems || {});
  const occupancy = resolveEquippedHandOccupancy(normalized);
  if (occupancy) normalized[occupancy.blockedSlot] = null;
  return normalized;
};
const createEmptyWeaponSet = () => ({
  mainHand: null,
  offHand: null
});
const normalizeWeaponSet = function () {
  let weaponSet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const normalized = normalizeEquippedHandSlots({
    mainHand: (weaponSet === null || weaponSet === void 0 ? void 0 : weaponSet.mainHand) || null,
    offHand: (weaponSet === null || weaponSet === void 0 ? void 0 : weaponSet.offHand) || null
  });
  return {
    mainHand: normalized.mainHand || null,
    offHand: normalized.offHand || null
  };
};
const normalizeEquippedWeaponSets = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const source = equippedItems && typeof equippedItems === 'object' ? equippedItems : {};
  const activeWeaponSet = clampWeaponSetIndex(source.activeWeaponSet);
  const legacySet = normalizeWeaponSet(source);
  const storedSets = Array.isArray(source.weaponSets) ? source.weaponSets : [];
  const weaponSets = Array.from({
    length: ROGUELITE_WEAPON_SET_COUNT
  }, (_, index) => normalizeWeaponSet(storedSets[index] || (index === 0 ? legacySet : createEmptyWeaponSet())));
  const activeSet = weaponSets[activeWeaponSet];
  return _objectSpread2(_objectSpread2({}, source), {}, {
    weaponSets,
    activeWeaponSet,
    // Alias de compatibilidad para Canvas, inspector y consumidores antiguos.
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand
  });
};
const resolveEquippedWeaponSet = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  return normalized.weaponSets[clampWeaponSetIndex(index)];
};
const equipItemInWeaponSet = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let weaponSetIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let slot = arguments.length > 2 ? arguments[2] : undefined;
  let item = arguments.length > 3 ? arguments[3] : undefined;
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const resolvedIndex = clampWeaponSetIndex(weaponSetIndex);
  const alreadyUsedElsewhere = item && normalized.weaponSets.some((weaponSet, index) => ['mainHand', 'offHand'].some(candidateSlot => !(index === resolvedIndex && candidateSlot === slot) && equipmentItemsShareInstance(weaponSet[candidateSlot], item)));
  if (alreadyUsedElsewhere) return normalized;
  const nextSet = equipItemInSlot(normalized.weaponSets[resolvedIndex], slot, item);
  const weaponSets = normalized.weaponSets.map((weaponSet, index) => index === resolvedIndex ? normalizeWeaponSet(nextSet) : weaponSet);
  const activeSet = weaponSets[normalized.activeWeaponSet];
  return _objectSpread2(_objectSpread2({}, normalized), {}, {
    weaponSets,
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand
  });
};
const activateWeaponSet = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let weaponSetIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const activeWeaponSet = clampWeaponSetIndex(weaponSetIndex);
  const activeSet = normalized.weaponSets[activeWeaponSet];
  return _objectSpread2(_objectSpread2({}, normalized), {}, {
    activeWeaponSet,
    mainHand: activeSet.mainHand,
    offHand: activeSet.offHand
  });
};
const equipItemInSlot = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let slot = arguments.length > 1 ? arguments[1] : undefined;
  let item = arguments.length > 2 ? arguments[2] : undefined;
  if (Array.isArray(equippedItems === null || equippedItems === void 0 ? void 0 : equippedItems.weaponSets) && HAND_SLOTS.includes(slot)) {
    return equipItemInWeaponSet(equippedItems, equippedItems.activeWeaponSet, slot, item);
  }
  const normalized = normalizeEquippedHandSlots(equippedItems);
  if (!HAND_SLOTS.includes(slot)) {
    return _objectSpread2(_objectSpread2({}, normalized), {}, {
      [slot]: item
    });
  }
  if (!item) return _objectSpread2(_objectSpread2({}, normalized), {}, {
    [slot]: null
  });
  const otherSlot = slot === 'mainHand' ? 'offHand' : 'mainHand';
  if (equipmentItemsShareInstance(normalized[otherSlot], item)) return normalized;
  const next = _objectSpread2(_objectSpread2({}, normalized), {}, {
    [slot]: item
  });
  if (equipmentPool_resolveEquipmentHandsRequired(item) === 2 || equipmentPool_resolveEquipmentHandsRequired(normalized[otherSlot]) === 2) {
    next[otherSlot] = null;
  }
  return next;
};
const createEquipmentTemplateId = function () {
  var _ref8, _item$templateId, _ref9, _item$name;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let category = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'objects';
  const explicitId = (_ref8 = (_item$templateId = item.templateId) !== null && _item$templateId !== void 0 ? _item$templateId : item.catalogId) !== null && _ref8 !== void 0 ? _ref8 : item.id;
  if (String(explicitId || '').trim()) return String(explicitId).trim();
  const name = (_ref9 = (_item$name = item.name) !== null && _item$name !== void 0 ? _item$name : item.nombre) !== null && _ref9 !== void 0 ? _ref9 : 'objeto';
  return "".concat(category, ":").concat(slugify(name) || 'sin-nombre');
};
const resolveEquipmentInstanceId = function () {
  var _ref0, _item$instanceId;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const explicitId = (_ref0 = (_item$instanceId = item === null || item === void 0 ? void 0 : item.instanceId) !== null && _item$instanceId !== void 0 ? _item$instanceId : item === null || item === void 0 ? void 0 : item.runItemId) !== null && _ref0 !== void 0 ? _ref0 : item === null || item === void 0 ? void 0 : item.inventoryInstanceId;
  return String(explicitId || '').trim() || null;
};
const equipmentItemsShareInstance = (left, right) => {
  if (!left || !right) return false;
  const leftInstanceId = resolveEquipmentInstanceId(left);
  const rightInstanceId = resolveEquipmentInstanceId(right);
  if (leftInstanceId && rightInstanceId) return leftInstanceId === rightInstanceId;
  const leftIndex = Number(left === null || left === void 0 ? void 0 : left._index);
  const rightIndex = Number(right === null || right === void 0 ? void 0 : right._index);
  const leftCategory = (left === null || left === void 0 ? void 0 : left._category) || (left === null || left === void 0 ? void 0 : left.itemType) || (left === null || left === void 0 ? void 0 : left.type);
  const rightCategory = (right === null || right === void 0 ? void 0 : right._category) || (right === null || right === void 0 ? void 0 : right.itemType) || (right === null || right === void 0 ? void 0 : right.type);
  if (Number.isInteger(leftIndex) && Number.isInteger(rightIndex) && leftIndex === rightIndex && String(leftCategory || '') === String(rightCategory || '')) {
    return true;
  }

  // Legacy loadouts did not store a physical instance id. Falling back to the
  // template keeps one old item from being interpreted as infinite copies.
  if (!leftInstanceId && !rightInstanceId) {
    return createEquipmentTemplateId(left, left === null || left === void 0 ? void 0 : left._category) === createEquipmentTemplateId(right, right === null || right === void 0 ? void 0 : right._category);
  }
  return false;
};
const materializeEquipmentInstances = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let fallbackCategory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'objects';
  const occurrences = new Map();
  const assignedIds = new Set(items.map(resolveEquipmentInstanceId).filter(Boolean));
  return items.map(item => {
    const category = EQUIPMENT_CATEGORIES.includes(item === null || item === void 0 ? void 0 : item._category) ? item._category : fallbackCategory;
    const templateId = createEquipmentTemplateId(item, category);
    const explicitInstanceId = resolveEquipmentInstanceId(item);
    if (explicitInstanceId) {
      return _objectSpread2(_objectSpread2({}, item), {}, {
        templateId,
        instanceId: explicitInstanceId
      });
    }
    let occurrence = (occurrences.get("".concat(category, ":").concat(templateId)) || 0) + 1;
    let instanceId = "".concat(templateId, "::").concat(occurrence);
    while (assignedIds.has(instanceId)) {
      occurrence += 1;
      instanceId = "".concat(templateId, "::").concat(occurrence);
    }
    occurrences.set("".concat(category, ":").concat(templateId), occurrence);
    assignedIds.add(instanceId);
    return _objectSpread2(_objectSpread2({}, item), {}, {
      templateId,
      instanceId
    });
  });
};
const normalizeEquipmentPoolItem = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let category = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'objects';
  const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
  const details = item.details && typeof item.details === 'object' ? item.details : item.detalles && typeof item.detalles === 'object' ? item.detalles : {};
  const rawDetails = details.raw && typeof details.raw === 'object' ? details.raw : {};
  const firstValue = function () {
    for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
      values[_key] = arguments[_key];
    }
    return values.find(value => value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== ''));
  };
  const name = firstValue(item.name, item.nombre, payload.name, payload.nombre, rawDetails.name, rawDetails.nombre, details.name, details.nombre);
  const rarity = firstValue(item.rareza, item.rarity, payload.rareza, payload.rarity, rawDetails.rareza, rawDetails.rarity);
  const image = firstValue(item.image, item.imagen, item.imageUrl, item.img, payload.image, payload.imagen, payload.imageUrl, payload.img, rawDetails.image, rawDetails.imagen, rawDetails.imageUrl, rawDetails.img);
  const description = firstValue(item.description, item.descripcion, item.detail, payload.description, payload.descripcion, payload.detail, rawDetails.description, rawDetails.descripcion, details.description, details.descripcion);
  const normalized = _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, payload), rawDetails), details), item), name ? {
    name
  } : {}), rarity ? {
    rareza: rarity,
    rarity
  } : {}), image ? {
    image
  } : {}), description ? {
    description
  } : {}), {}, {
    templateId: createEquipmentTemplateId(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, payload), rawDetails), details), item), {}, {
      name
    }), category)
  });
  if (category === 'armor' || item.itemType === 'armor') {
    delete normalized.actionCost;
    delete normalized.consumption;
    delete normalized.consumo;
    delete normalized.cost;
    delete normalized.coste;
  }
  if (category === 'weapons' || item.itemType === 'weapon') {
    normalized.handsRequired = equipmentPool_resolveEquipmentHandsRequired(item);
  }
  return normalized;
};
const normalizeRogueliteEquipmentPool = equipment => {
  const pool = createEmptyEquipmentPool();
  if (Array.isArray(equipment)) {
    equipment.forEach(item => {
      const category = EQUIPMENT_CATEGORIES.includes(item === null || item === void 0 ? void 0 : item._category) ? item._category : 'objects';
      pool[category].push(normalizeEquipmentPoolItem(item, category));
    });
    EQUIPMENT_CATEGORIES.forEach(category => {
      pool[category] = materializeEquipmentInstances(pool[category], category);
    });
    return pool;
  }
  if (!equipment || typeof equipment !== 'object') return pool;
  EQUIPMENT_CATEGORIES.forEach(category => {
    pool[category] = materializeEquipmentInstances((Array.isArray(equipment[category]) ? equipment[category] : []).map(item => normalizeEquipmentPoolItem(item, category)), category);
  });
  return pool;
};
const findInventoryCopy = (items, equippedItem, usedInstanceIds, category) => {
  if (!equippedItem) return null;
  const equippedInstanceId = resolveEquipmentInstanceId(equippedItem);
  const templateId = createEquipmentTemplateId(equippedItem, category);
  let match = equippedInstanceId ? items.find(item => resolveEquipmentInstanceId(item) === equippedInstanceId && !usedInstanceIds.has(equippedInstanceId)) : null;
  const legacyIndex = Number(equippedItem === null || equippedItem === void 0 ? void 0 : equippedItem._index);
  if (!match && !equippedInstanceId && Number.isInteger(legacyIndex)) {
    const indexedItem = items[legacyIndex];
    if (indexedItem && createEquipmentTemplateId(indexedItem, category) === templateId && !usedInstanceIds.has(resolveEquipmentInstanceId(indexedItem))) {
      match = indexedItem;
    }
  }

  // An authoritative runtime instance that has disappeared was dropped or
  // given away. Never silently replace it with another copy of the template.
  if (!match && equippedInstanceId) return null;
  if (!match) {
    match = items.find(item => createEquipmentTemplateId(item, category) === templateId && !usedInstanceIds.has(resolveEquipmentInstanceId(item)));
  }
  if (!match) return null;
  const instanceId = resolveEquipmentInstanceId(match);
  if (instanceId) usedInstanceIds.add(instanceId);
  return _objectSpread2(_objectSpread2(_objectSpread2({}, match), equippedItem), {}, {
    templateId: match.templateId,
    instanceId
  });
};
const reconcileEquippedItemsWithInventory = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let inventory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const pool = normalizeRogueliteEquipmentPool(inventory);
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const usedInstanceIds = new Set();
  const weaponSets = normalized.weaponSets.map(weaponSet => normalizeWeaponSet({
    mainHand: findInventoryCopy(pool.weapons, weaponSet.mainHand, usedInstanceIds, 'weapons'),
    offHand: findInventoryCopy(pool.weapons, weaponSet.offHand, usedInstanceIds, 'weapons')
  }));
  const reconciled = _objectSpread2(_objectSpread2({}, normalized), {}, {
    weaponSets,
    body: findInventoryCopy(pool.armor, normalized.body, usedInstanceIds, 'armor'),
    accessory_1: findInventoryCopy(pool.accessories, normalized.accessory_1, usedInstanceIds, 'accessories'),
    accessory_2: findInventoryCopy(pool.accessories, normalized.accessory_2, usedInstanceIds, 'accessories')
  });
  Object.keys(normalized).forEach(slot => {
    if (slot.startsWith('belt_')) {
      reconciled[slot] = findInventoryCopy(pool.objects, normalized[slot], usedInstanceIds, 'objects');
    }
  });
  return normalizeEquippedWeaponSets(reconciled);
};
const resolveEquippedItemUsages = function () {
  let equippedItems = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let item = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  if (!item) return [];
  const normalized = normalizeEquippedWeaponSets(equippedItems);
  const usages = [];
  normalized.weaponSets.forEach((weaponSet, weaponSetIndex) => {
    ['offHand', 'mainHand'].forEach(slot => {
      const equippedItem = weaponSet[slot];
      if (!equipmentItemsShareInstance(equippedItem, item)) return;
      usages.push({
        weaponSetIndex,
        slot,
        handsRequired: equipmentPool_resolveEquipmentHandsRequired(equippedItem)
      });
    });
  });
  return usages;
};
const resolveRogueliteEquipmentPool = function () {
  var _ref1, _classDefinition$rogu, _classDefinition$rogu2;
  let classDefinition = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return normalizeRogueliteEquipmentPool((_ref1 = (_classDefinition$rogu = (_classDefinition$rogu2 = classDefinition.roguelite) === null || _classDefinition$rogu2 === void 0 ? void 0 : _classDefinition$rogu2.startingEquipmentPool) !== null && _classDefinition$rogu !== void 0 ? _classDefinition$rogu : classDefinition.startingEquipmentPool) !== null && _ref1 !== void 0 ? _ref1 : classDefinition.equipment);
};

;// ./src/features/roguelite/catalogItem.js


const clampInteger = function (value, minimum, maximum) {
  let fallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : minimum;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
};
const splitTraits = value => {
  if (Array.isArray(value)) {
    return value.map(trait => String(trait || '').trim()).filter(Boolean);
  }
  return String(value || '').split(',').map(trait => trait.trim()).filter(Boolean);
};
const joinTraits = value => splitTraits(value).join(', ');
const resolveRulesDescription = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return item.descripcion || item.rulesDescription || item.descripcionReglas || item.description || '';
};
const resolveLoreDescription = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return item.lore || item.descripcionLore || item.flavorText || item.flavourText || '';
};
const normalizeDescriptionsForStorage = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const description = String(resolveRulesDescription(item) || '').trim();
  const lore = String(resolveLoreDescription(item) || '').trim();
  return {
    description,
    descripcion: description,
    lore,
    descripcionLore: lore
  };
};
const ACTION_DICE_COSTS = Object.freeze([0, 1, 2, 3]);
const EQUIPMENT_RANGES = Object.freeze(['Toque', 'Cercano', 'Intermedio', 'Lejano', 'Extremo']);
const ABILITY_RANGES = Object.freeze(['Arma', 'Catalizador', 'Toque', 'Cercano', 'Intermedio', 'Lejano', 'Extremo']);
const WEAPON_COMPETENCES = Object.freeze(['Simple', 'Marcial', 'Arcana']);
const ARMOR_COMPETENCES = Object.freeze(['Ligera', 'Media', 'Pesada', 'Arcana']);
const parseActionDiceCost = function (value) {
  var _text$match;
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  if (typeof value === 'number') return clampInteger(value, 0, 3, fallback);
  const text = String(value || '').trim();
  if (!text) return fallback;
  const diceIcons = text.match(/🟡/g);
  if (diceIcons !== null && diceIcons !== void 0 && diceIcons.length) return clampInteger(diceIcons.length, 0, 3, fallback);
  const numeric = (_text$match = text.match(/\d+/)) === null || _text$match === void 0 ? void 0 : _text$match[0];
  return numeric === undefined ? fallback : clampInteger(numeric, 0, 3, fallback);
};
const toLegacyActionDiceCost = value => '🟡'.repeat(parseActionDiceCost(value, 0));
const omitLegacyFields = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let keys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return Object.fromEntries(Object.entries(item).filter(_ref => {
    let [key] = _ref;
    return !keys.includes(key);
  }));
};
const commonLegacyFields = (/* unused pure expression or super */ null && (['carga', 'cargaFisica', 'cargaMental', 'physicalLoad', 'mentalLoad', 'cuerpo', 'mente', 'tecnologia', 'technology']));
const armorCostFields = (/* unused pure expression or super */ null && (['actionCost', 'consumo', 'consumption', 'cost', 'coste']));
const createEmptyWeaponCatalogItem = () => ({
  id: '',
  nombre: '',
  dano: '',
  alcance: 'Cercano',
  actionCost: 1,
  handsRequired: 1,
  competence: 'Simple',
  rasgos: '',
  descripcion: '',
  lore: '',
  valor: '',
  rareza: ''
});
const createEmptyArmorCatalogItem = () => ({
  id: '',
  nombre: '',
  defenseClass: '',
  competence: 'Ligera',
  rasgos: '',
  descripcion: '',
  lore: '',
  valor: '',
  rareza: ''
});
const createEmptyAccessoryCatalogItem = () => ({
  id: '',
  nombre: '',
  rasgos: '',
  descripcion: '',
  lore: '',
  valor: '',
  rareza: ''
});
const createEmptyAbilityCatalogItem = () => ({
  id: '',
  nombre: '',
  alcance: 'Arma',
  actionCost: 1,
  poder: '',
  rasgos: '',
  descripcion: '',
  lore: '',
  rareza: ''
});
const weaponCatalogItemToForm = function () {
  var _ref2, _item$actionCost, _ref3, _ref4, _ref5, _item$competence, _item$rasgos;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread(_objectSpread({}, createEmptyWeaponCatalogItem()), omitLegacyFields(item, [...commonLegacyFields, 'tipoDano', 'damageType'])), {}, {
    actionCost: parseActionDiceCost((_ref2 = (_item$actionCost = item.actionCost) !== null && _item$actionCost !== void 0 ? _item$actionCost : item.consumo) !== null && _ref2 !== void 0 ? _ref2 : item.cost, 1),
    handsRequired: resolveEquipmentHandsRequired(item),
    competence: (_ref3 = (_ref4 = (_ref5 = (_item$competence = item.competence) !== null && _item$competence !== void 0 ? _item$competence : item.competencia) !== null && _ref5 !== void 0 ? _ref5 : item.weaponCompetence) !== null && _ref4 !== void 0 ? _ref4 : item.tipo) !== null && _ref3 !== void 0 ? _ref3 : 'Simple',
    rasgos: joinTraits((_item$rasgos = item.rasgos) !== null && _item$rasgos !== void 0 ? _item$rasgos : item.traits),
    descripcion: resolveRulesDescription(item),
    lore: resolveLoreDescription(item)
  });
};
const armorCatalogItemToForm = function () {
  var _ref6, _ref7, _ref8, _item$defenseClass, _ref9, _ref0, _ref1, _item$competence2, _item$rasgos2;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread(_objectSpread({}, createEmptyArmorCatalogItem()), omitLegacyFields(item, [...commonLegacyFields, ...armorCostFields])), {}, {
    defenseClass: (_ref6 = (_ref7 = (_ref8 = (_item$defenseClass = item.defenseClass) !== null && _item$defenseClass !== void 0 ? _item$defenseClass : item.cd) !== null && _ref8 !== void 0 ? _ref8 : item.defensa) !== null && _ref7 !== void 0 ? _ref7 : item.defense) !== null && _ref6 !== void 0 ? _ref6 : '',
    competence: (_ref9 = (_ref0 = (_ref1 = (_item$competence2 = item.competence) !== null && _item$competence2 !== void 0 ? _item$competence2 : item.competencia) !== null && _ref1 !== void 0 ? _ref1 : item.armorCompetence) !== null && _ref0 !== void 0 ? _ref0 : item.tipo) !== null && _ref9 !== void 0 ? _ref9 : 'Ligera',
    rasgos: joinTraits((_item$rasgos2 = item.rasgos) !== null && _item$rasgos2 !== void 0 ? _item$rasgos2 : item.traits),
    descripcion: resolveRulesDescription(item),
    lore: resolveLoreDescription(item)
  });
};
const accessoryCatalogItemToForm = function () {
  var _item$rasgos3;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread(_objectSpread({}, createEmptyAccessoryCatalogItem()), omitLegacyFields(item, [...commonLegacyFields, 'defensa', 'defense'])), {}, {
    rasgos: joinTraits((_item$rasgos3 = item.rasgos) !== null && _item$rasgos3 !== void 0 ? _item$rasgos3 : item.traits),
    descripcion: resolveRulesDescription(item),
    lore: resolveLoreDescription(item)
  });
};
const abilityCatalogItemToForm = function () {
  var _ref10, _item$actionCost2, _ref11, _ref12, _item$poder, _item$rasgos4;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread(_objectSpread({}, createEmptyAbilityCatalogItem()), omitLegacyFields(item, commonLegacyFields)), {}, {
    actionCost: parseActionDiceCost((_ref10 = (_item$actionCost2 = item.actionCost) !== null && _item$actionCost2 !== void 0 ? _item$actionCost2 : item.consumo) !== null && _ref10 !== void 0 ? _ref10 : item.cost, 1),
    poder: (_ref11 = (_ref12 = (_item$poder = item.poder) !== null && _item$poder !== void 0 ? _item$poder : item.damage) !== null && _ref12 !== void 0 ? _ref12 : item.dano) !== null && _ref11 !== void 0 ? _ref11 : '',
    rasgos: joinTraits((_item$rasgos4 = item.rasgos) !== null && _item$rasgos4 !== void 0 ? _item$rasgos4 : item.traits),
    descripcion: resolveRulesDescription(item),
    lore: resolveLoreDescription(item)
  });
};
const weaponCatalogItemToStorage = function () {
  var _item$actionCost3;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const clean = omitLegacyFields(item, [...commonLegacyFields, 'tipoDano', 'damageType', 'requiredHands', 'manosRequeridas', 'manos', 'cost']);
  const actionCost = parseActionDiceCost((_item$actionCost3 = item.actionCost) !== null && _item$actionCost3 !== void 0 ? _item$actionCost3 : item.consumo, 1);
  const handsRequired = clampInteger(item.handsRequired, 1, 2, 1);
  return _objectSpread(_objectSpread({}, clean), {}, {
    actionCost,
    consumo: toLegacyActionDiceCost(actionCost),
    handsRequired,
    competence: item.competence || 'Simple',
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim()
  }, normalizeDescriptionsForStorage(item));
};
const armorCatalogItemToStorage = function () {
  var _ref13, _ref14, _item$defenseClass2;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const clean = omitLegacyFields(item, [...commonLegacyFields, ...armorCostFields, 'defense']);
  const defenseClass = String((_ref13 = (_ref14 = (_item$defenseClass2 = item.defenseClass) !== null && _item$defenseClass2 !== void 0 ? _item$defenseClass2 : item.cd) !== null && _ref14 !== void 0 ? _ref14 : item.defensa) !== null && _ref13 !== void 0 ? _ref13 : '').trim();
  return _objectSpread(_objectSpread({}, clean), {}, {
    defenseClass,
    defensa: defenseClass,
    competence: item.competence || 'Ligera',
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim()
  }, normalizeDescriptionsForStorage(item));
};
const accessoryCatalogItemToStorage = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return _objectSpread(_objectSpread({}, omitLegacyFields(item, [...commonLegacyFields, 'defensa', 'defense'])), {}, {
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim()
  }, normalizeDescriptionsForStorage(item));
};
const abilityCatalogItemToStorage = function () {
  var _item$actionCost4;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const clean = omitLegacyFields(item, [...commonLegacyFields, 'cost', 'damage', 'dano']);
  const actionCost = parseActionDiceCost((_item$actionCost4 = item.actionCost) !== null && _item$actionCost4 !== void 0 ? _item$actionCost4 : item.consumo, 1);
  return _objectSpread(_objectSpread({}, clean), {}, {
    actionCost,
    consumo: toLegacyActionDiceCost(actionCost),
    poder: String(item.poder || '').trim(),
    rasgos: splitTraits(item.rasgos),
    rareza: String(item.rareza || '').trim()
  }, normalizeDescriptionsForStorage(item));
};
;// ./src/features/tactical-shared/tokenVisibilityAccess.js




const HIDDEN_TOKEN_STATUS_ID = (/* unused pure expression or super */ null && (HIDDEN_STATUS_EFFECT_ID));
const getControllerIds = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const controlledBy = Array.isArray(token.controlledBy) ? token.controlledBy : typeof token.controlledBy === 'string' ? [token.controlledBy] : [];
  return controlledBy.map(controller => normalizeCombatSideKey(controller)).filter(Boolean);
};
const isSmokeArea = function () {
  var _item$areaEffect, _item$areaEffect2;
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (item === null || item === void 0 ? void 0 : item.type) === 'geometry' && (item.geometryKind === 'smoke' || ((_item$areaEffect = item.areaEffect) === null || _item$areaEffect === void 0 ? void 0 : _item$areaEffect.type) === 'smoke' || ((_item$areaEffect2 = item.areaEffect) === null || _item$areaEffect2 === void 0 ? void 0 : _item$areaEffect2.id) === 'smoke-concealment');
};
const overlapsSmoke = (token, item) => {
  const left = Number(token.x) || 0;
  const top = Number(token.y) || 0;
  const areaLeft = Number(item.x) || 0;
  const areaTop = Number(item.y) || 0;
  return left < areaLeft + Math.max(1, Number(item.width) || 1) && left + Math.max(1, Number(token.width) || 1) > areaLeft && top < areaTop + Math.max(1, Number(item.height) || 1) && top + Math.max(1, Number(token.height) || 1) > areaTop;
};

// Scene arrays are immutable snapshots. Reuse membership and viewer calculations
// across token rendering, formation placement, targeting and fog masks.
const smokeSceneCache = new WeakMap();
const getSmokeScene = items => {
  if (!smokeSceneCache.has(items)) {
    const areas = items.filter(isSmokeArea);
    const groups = new Map();
    // Overlaps and shared edges form one continuous cloud. The two cells of
    // a legacy extended Niebla are also one zone, including diagonal adjacency.
    areas.forEach(area => {
      if (groups.has(area)) return;
      const group = new Set([area]);
      for (const current of group) {
        areas.forEach(other => {
          var _current$areaEffect, _other$areaEffect;
          const dx = Math.min(current.x + current.width, other.x + other.width) - Math.max(current.x, other.x);
          const dy = Math.min(current.y + current.height, other.y + other.height) - Math.max(current.y, other.y);
          const sameMist = ((_current$areaEffect = current.areaEffect) === null || _current$areaEffect === void 0 ? void 0 : _current$areaEffect.spellId) === 'arcane-mist' && ((_other$areaEffect = other.areaEffect) === null || _other$areaEffect === void 0 ? void 0 : _other$areaEffect.spellId) === 'arcane-mist' && current.areaEffect.cloudId && current.areaEffect.cloudId === other.areaEffect.cloudId && dx >= 0 && dy >= 0;
          if (dx > 0 && dy >= 0 || dy > 0 && dx >= 0 || sameMist) group.add(other);
        });
      }
      group.forEach(member => groups.set(member, group));
    });
    smokeSceneCache.set(items, {
      areas,
      groups,
      memberships: new WeakMap(),
      footprints: new WeakMap(),
      viewers: new Map(),
      teams: new Map()
    });
  }
  return smokeSceneCache.get(items);
};
const getTokenSmokeAreas = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  if (!items.length || !legacyCombatRules_isCombatTokenItem(token)) return [];
  const scene = getSmokeScene(items);
  if (!scene.memberships.has(token)) {
    scene.memberships.set(token, scene.areas.filter(area => overlapsSmoke(token, area)));
  }
  return scene.memberships.get(token);
};
const isTokenInsideSmokeArea = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return getTokenSmokeAreas(token, items).length > 0;
};

// Dragged positions and unconfirmed combat movement are visual previews.
// Keep every vision calculation on the last committed footprint until the
// move is released (exploration) or the turn is confirmed (combat).
const getCanvasCommittedVisionItems = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let {
    draggedTokenId = null,
    tokenOriginalPos = {},
    pendingTurnState = null,
    isPlayerView = false
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const pendingId = isPlayerView ? pendingTurnState === null || pendingTurnState === void 0 ? void 0 : pendingTurnState.tokenId : null;
  if (!draggedTokenId && !pendingId) return items;
  let changed = false;
  const committed = items.map(item => {
    if (!isCombatTokenItem(item)) return item;
    const pendingOrigin = item.id === pendingId ? {
      x: pendingTurnState.startX,
      y: pendingTurnState.startY
    } : null;
    const dragOrigin = draggedTokenId && tokenOriginalPos[item.id];
    const origin = pendingOrigin || dragOrigin;
    if (!origin || !Number.isFinite(Number(origin.x)) || !Number.isFinite(Number(origin.y))) return item;
    const x = Number(origin.x);
    const y = Number(origin.y);
    if (item.x === x && item.y === y) return item;
    changed = true;
    return _objectSpread(_objectSpread({}, item), {}, {
      x,
      y
    });
  });
  return changed ? committed : items;
};
const getOpenRect = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const left = Number(item.x) || 0;
  const top = Number(item.y) || 0;
  return {
    left,
    top,
    right: left + Math.max(1, Number(item.width) || 1),
    bottom: top + Math.max(1, Number(item.height) || 1)
  };
};
const uniqueSorted = values => Array.from(new globalThis.Set(values.map(value => Number(value).toFixed(6)))).map(Number).sort((a, b) => a - b);
const pointInsideSmoke = (point, area) => {
  const rect = getOpenRect(area);
  return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
};

// Split a token's footprint at every smoke edge that crosses it. The centre of
// each resulting region represents one mechanically distinct exposed/interior
// part of the base, without depending on the portrait drawn inside it.
const getTokenSmokeFootprint = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const scene = getSmokeScene(items);
  if (scene.footprints.has(token)) return scene.footprints.get(token);
  const bounds = getOpenRect(token);
  const overlappingAreas = getTokenSmokeAreas(token, items);
  const xCuts = [bounds.left, bounds.right];
  const yCuts = [bounds.top, bounds.bottom];
  overlappingAreas.forEach(area => {
    const rect = getOpenRect(area);
    if (rect.left > bounds.left && rect.left < bounds.right) xCuts.push(rect.left);
    if (rect.right > bounds.left && rect.right < bounds.right) xCuts.push(rect.right);
    if (rect.top > bounds.top && rect.top < bounds.bottom) yCuts.push(rect.top);
    if (rect.bottom > bounds.top && rect.bottom < bounds.bottom) yCuts.push(rect.bottom);
  });
  const xs = uniqueSorted(xCuts);
  const ys = uniqueSorted(yCuts);
  const anchors = [];
  for (let xIndex = 0; xIndex < xs.length - 1; xIndex += 1) {
    for (let yIndex = 0; yIndex < ys.length - 1; yIndex += 1) {
      const point = {
        x: (xs[xIndex] + xs[xIndex + 1]) / 2,
        y: (ys[yIndex] + ys[yIndex + 1]) / 2
      };
      anchors.push({
        point,
        areas: overlappingAreas.filter(area => pointInsideSmoke(point, area))
      });
    }
  }
  const hasInterior = anchors.some(anchor => anchor.areas.length > 0);
  const hasExterior = anchors.some(anchor => anchor.areas.length === 0);
  const footprint = {
    anchors,
    areas: overlappingAreas,
    hasInterior,
    hasExterior
  };
  scene.footprints.set(token, footprint);
  return footprint;
};
const isTokenFullyInsideSmokeArea = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const footprint = getTokenSmokeFootprint(token, items);
  return footprint.hasInterior && !footprint.hasExterior;
};
const isTokenPartiallyInsideSmokeArea = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const footprint = getTokenSmokeFootprint(token, items);
  return footprint.hasInterior && footprint.hasExterior;
};

// Slab intersection against the open rectangle. A ray merely grazing an edge
// does not cross a smoke cell. No per-frame sampling or pixel readbacks required.
const segmentCrossesSmoke = (from, to, area) => {
  let enter = 0;
  let leave = 1;
  for (const [axis, size] of [['x', 'width'], ['y', 'height']]) {
    const delta = to[axis] - from[axis];
    const min = Number(area[axis]);
    const max = min + Number(area[size]);
    if (Math.abs(delta) < 0.000001) {
      if (from[axis] <= min || from[axis] >= max) return false;
    } else {
      const a = (min - from[axis]) / delta;
      const b = (max - from[axis]) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
    }
  }
  return leave - enter > 0.000001;
};
const canTokenSeeThroughSmoke = function (observer, target) {
  let items = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  if (!observer || !target) return false;
  const scene = getSmokeScene(items);
  const observerFootprint = getTokenSmokeFootprint(observer, items);
  const targetFootprint = getTokenSmokeFootprint(target, items);
  return observerFootprint.anchors.some(from => targetFootprint.anchors.some(to => {
    const sharesContinuousCloud = from.areas.some(area => to.areas.some(other => {
      var _scene$groups$get;
      return (_scene$groups$get = scene.groups.get(area)) === null || _scene$groups$get === void 0 ? void 0 : _scene$groups$get.has(other);
    }));
    if (sharesContinuousCloud) return true;
    if (from.areas.length > 0 || to.areas.length > 0) return false;
    return !scene.areas.some(area => segmentCrossesSmoke(from.point, to.point, area));
  }));
};
const tokenHasHiddenStatus = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Array.isArray(token.status) && token.status.some(status => {
    const statusId = typeof status === 'string' ? status : (status === null || status === void 0 ? void 0 : status.id) || (status === null || status === void 0 ? void 0 : status.name) || (status === null || status === void 0 ? void 0 : status.label) || '';
    return normalizeCombatSideKey(statusId) === HIDDEN_TOKEN_STATUS_ID;
  });
};
const isMasterOwnedCanvasToken = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const controllerIds = getControllerIds(token);
  const ownerIds = [token.linkedClassOwner, token.owner, token.ownerName].map(owner => normalizeCombatSideKey(owner || '')).filter(Boolean);
  const explicitAccessIds = controllerIds.length > 0 ? controllerIds : ownerIds;
  if (explicitAccessIds.length === 0) return true;
  return explicitAccessIds.some(controllerId => controllerId === 'master' || controllerId === 'gm' || controllerId === 'director' || controllerId === 'all' || controllerId === 'everyone');
};
const getPlayerCanvasTeamIds = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let playerName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  const scene = getSmokeScene(items);
  if (scene.teams.has(playerName)) return scene.teams.get(playerName);
  const teams = new globalThis.Set(items.filter(item => isCombatTokenItem(item) && canControlToken(item, true, playerName)).map(item => normalizeCombatSideKey(item.teamId || '')).filter(Boolean));
  scene.teams.set(playerName, teams);
  return teams;
};
const canPlayerAccessCanvasToken = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let playerName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  if (!isCombatTokenItem(token) || !playerName) return false;
  if (canControlToken(token, true, playerName)) return true;
  const tokenTeamId = normalizeCombatSideKey(token.teamId || '');
  return Boolean(tokenTeamId && getPlayerCanvasTeamIds(items, playerName).has(tokenTeamId));
};
const getPlayerCanvasVisionTokens = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let playerName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  return items.filter(item => (item === null || item === void 0 ? void 0 : item.hasVision) && canPlayerAccessCanvasToken(item, items, playerName));
};
const getCanvasSmokePerspective = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let {
    isPlayerView = false,
    playerName = '',
    selectedTokenIds = [],
    showHiddenTokens = false
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const scene = getSmokeScene(items);
  const key = JSON.stringify([isPlayerView, playerName, selectedTokenIds, showHiddenTokens]);
  if (scene.viewers.has(key)) return scene.viewers.get(key);
  const controlled = items.filter(item => isCombatTokenItem(item) && (isPlayerView ? canPlayerAccessCanvasToken(item, items, playerName) : isMasterOwnedCanvasToken(item)));
  const selected = items.filter(item => isCombatTokenItem(item) && selectedTokenIds.includes(item.id) && (!isPlayerView || controlled.includes(item)));
  const focused = selected.length > 0;
  const observers = focused ? selected : controlled.filter(item => item.hasVision !== false);
  const visibleAreas = new Set(observers.flatMap(item => getTokenSmokeAreas(item, items).flatMap(area => [...scene.groups.get(area)])));
  const perspective = {
    areas: scene.areas,
    visibleAreas,
    observers,
    focused,
    bypass: !isPlayerView && showHiddenTokens,
    outsideVisible: observers.length === 0 || observers.some(item => !isTokenFullyInsideSmokeArea(item, items))
  };
  if (scene.viewers.size >= 32) scene.viewers.clear();
  scene.viewers.set(key, perspective);
  return perspective;
};
const canViewerSeeCanvasToken = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let viewer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!isCombatTokenItem(token)) return true;
  const {
    isPlayerView = false,
    playerName = ''
  } = viewer;
  const perspective = getCanvasSmokePerspective(items, viewer);
  if (perspective.bypass) return true;
  const tokenAreas = getTokenSmokeAreas(token, items);
  const sharedAccess = isPlayerView ? canPlayerAccessCanvasToken(token, items, playerName) : isMasterOwnedCanvasToken(token);
  // Shared ownership applies in the overview; focus always simulates the token.
  const smokeVisible = perspective.observers.length > 0 ? perspective.observers.some(observer => canTokenSeeThroughSmoke(observer, token, items)) : tokenAreas.length === 0;
  if (!smokeVisible && (perspective.focused || !sharedAccess)) return false;
  if (!tokenHasHiddenStatus(token)) return true;
  return sharedAccess;
};
const isCanvasTokenHiddenFromViewer = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let viewer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return !canViewerSeeCanvasToken(token, items, viewer);
};
const getCanvasTokenFogDensity = function (token) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let viewer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (tokenHasHiddenStatus(token)) return 0.65;
  const areas = getTokenSmokeAreas(token, items);
  if (!areas.length) return 0;
  // The area itself already paints the covered portion. A second, token-wide
  // layer would incorrectly make a partially exposed large creature look as
  // though its whole footprint were inside the cloud.
  if (!isTokenFullyInsideSmokeArea(token, items)) return 0;
  const perspective = getCanvasSmokePerspective(items, viewer);
  return perspective.focused && !perspective.outsideVisible && areas.some(area => perspective.visibleAreas.has(area)) ? 0.2 : 0.65;
};
const getCanvasRenderItemsForViewer = function () {
  let items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let viewer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return (items || []).filter(item => !isCombatTokenItem(item) || canViewerSeeCanvasToken(item, items, viewer));
};
const removeHiddenStatusFromToken = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!tokenHasHiddenStatus(token)) return token;
  return _objectSpread(_objectSpread({}, token), {}, {
    status: token.status.filter(status => {
      const statusId = typeof status === 'string' ? status : (status === null || status === void 0 ? void 0 : status.id) || (status === null || status === void 0 ? void 0 : status.name) || (status === null || status === void 0 ? void 0 : status.label) || '';
      return normalizeCombatSideKey(statusId) !== HIDDEN_TOKEN_STATUS_ID;
    })
  });
};
const actionRevealsHidden = function () {
  let action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (action === null || action === void 0 ? void 0 : action.type) === 'attack' || (action === null || action === void 0 ? void 0 : action.actionType) === 'attack' || (action === null || action === void 0 ? void 0 : action.actionId) === 'attack' || (action === null || action === void 0 ? void 0 : action.actionId) === 'sweep' || (action === null || action === void 0 ? void 0 : action.revelaOculto) === true;
};
const getHiddenSafeMovementPreviewItems = function (movingToken) {
  let items = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return (items || []).filter(item => (item === null || item === void 0 ? void 0 : item.id) === (movingToken === null || movingToken === void 0 ? void 0 : movingToken.id) || !isCombatTokenItem(item) || canTokenSeeThroughSmoke(movingToken, item, items) && (!tokenHasHiddenStatus(item) || areTokensAllied(movingToken, item)));
};
const buildDirectGridPath = (fromCell, toCell) => {
  const steps = [];
  let x = fromCell.x;
  let y = fromCell.y;
  while (x !== toCell.x || y !== toCell.y) {
    x += Math.sign(toCell.x - x);
    y += Math.sign(toCell.y - y);
    steps.push({
      x,
      y
    });
  }
  return steps;
};
const doCellSetsOverlap = function () {
  let firstCells = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let secondCells = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const secondKeys = new globalThis.Set(secondCells.map(cell => "".concat(cell.x, ":").concat(cell.y)));
  return firstCells.some(cell => secondKeys.has("".concat(cell.x, ":").concat(cell.y)));
};
const resolveHiddenDetectionAlongMovement = function () {
  let {
    movingToken,
    from,
    to,
    items = [],
    config = {}
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const unchanged = {
    detected: false,
    blocked: false,
    stopped: false,
    spentCost: 0,
    finalPosition: to,
    revealedTokenIds: [],
    items
  };
  if (!isCombatTokenItem(movingToken) || !from || !to) return unchanged;
  // An invalid route cannot discover a token through a wall before the drag
  // is rejected by the movement controller.
  if (isCombatMoveBlockedByWall(_objectSpread(_objectSpread({}, movingToken), from), to, items, config)) return unchanged;
  const startToken = _objectSpread(_objectSpread({}, movingToken), {}, {
    x: from.x,
    y: from.y
  });
  const targetToken = _objectSpread(_objectSpread({}, movingToken), {}, {
    x: to.x,
    y: to.y
  });
  const startCell = getTokenPrimaryGridCell(startToken, config);
  const targetCell = getTokenPrimaryGridCell(targetToken, config);
  const path = buildDirectGridPath(startCell, targetCell);
  if (path.length === 0) return unchanged;
  let workingItems = items;
  let lastValidPosition = {
    x: from.x,
    y: from.y
  };
  for (let index = 0; index < path.length; index += 1) {
    const cell = path[index];
    const stepPosition = getCombatTokenPositionForPrimaryCell(movingToken, cell, config);
    const liveMovingToken = workingItems.find(item => item.id === movingToken.id) || movingToken;
    const steppedToken = _objectSpread(_objectSpread({}, liveMovingToken), {}, {
      x: stepPosition.x,
      y: stepPosition.y
    });
    const movingCells = getTokenOccupiedCellsAtPosition(steppedToken, stepPosition, config);
    const touchingEnemies = workingItems.filter(item => item.id !== movingToken.id && isCombatTokenItem(item) && !areTokensAllied(steppedToken, item) && doCellSetsOverlap(movingCells, getTokenOccupiedCellsAtPosition(item, {
      x: item.x,
      y: item.y
    }, config)));
    const revealedIds = new globalThis.Set();
    if (touchingEnemies.length > 0 && tokenHasHiddenStatus(steppedToken)) {
      revealedIds.add(steppedToken.id);
    }
    touchingEnemies.forEach(enemy => {
      if (tokenHasHiddenStatus(enemy)) revealedIds.add(enemy.id);
    });
    if (revealedIds.size === 0) {
      lastValidPosition = stepPosition;
      continue;
    }
    workingItems = workingItems.map(item => revealedIds.has(item.id) ? removeHiddenStatusFromToken(item) : item);
    const revealedMovingToken = removeHiddenStatusFromToken(steppedToken);
    const occupancyIssue = getCombatCellOccupancyIssue({
      movingToken: revealedMovingToken,
      nextX: stepPosition.x,
      nextY: stepPosition.y,
      items: workingItems,
      config,
      excludeIds: [movingToken.id]
    });
    return {
      detected: true,
      blocked: Boolean(occupancyIssue),
      stopped: true,
      spentCost: occupancyIssue ? index : index + 1,
      finalPosition: occupancyIssue ? lastValidPosition : stepPosition,
      revealedTokenIds: Array.from(revealedIds),
      items: workingItems.map(item => item.id === movingToken.id ? _objectSpread(_objectSpread({}, item), {}, {
        x: occupancyIssue ? lastValidPosition.x : stepPosition.x,
        y: occupancyIssue ? lastValidPosition.y : stepPosition.y
      }) : item),
      occupancyIssue
    };
  }
  return _objectSpread(_objectSpread({}, unchanged), {}, {
    spentCost: path.length,
    finalPosition: to
  });
};
;// ./src/features/canvas/combat/canvasAttackRules.js








const RANGE_VALUES = Object.freeze({
  toque: 0,
  cercano: 1,
  intermedio: 2,
  lejano: 3,
  extremo: Number.POSITIVE_INFINITY
});
const canvasAttackRules_normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const canvasAttackRules_asInteger = function (value) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};
const hasCanvasStatus = (token, id) => ((token === null || token === void 0 ? void 0 : token.status) || []).some(status => canvasAttackRules_normalizeText(typeof status === 'string' ? status : (status === null || status === void 0 ? void 0 : status.id) || (status === null || status === void 0 ? void 0 : status.name) || (status === null || status === void 0 ? void 0 : status.label)) === id);
const isCanvasProne = token => hasCanvasStatus(token, 'derribado');
const getCanvasWeaponTraits = function () {
  var _ref, _ref2, _weapon$rasgos;
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const source = (_ref = (_ref2 = (_weapon$rasgos = weapon.rasgos) !== null && _weapon$rasgos !== void 0 ? _weapon$rasgos : weapon.traits) !== null && _ref2 !== void 0 ? _ref2 : weapon.properties) !== null && _ref !== void 0 ? _ref : [];
  if (Array.isArray(source)) return source.map(canvasAttackRules_normalizeText).map(trait => isPoisonTrait(trait) ? 'venenosa' : ['perforacion', 'penetrante'].includes(trait) ? 'perforante' : trait).filter(Boolean);
  return String(source || '').split(',').map(canvasAttackRules_normalizeText).map(trait => isPoisonTrait(trait) ? 'venenosa' : ['perforacion', 'penetrante'].includes(trait) ? 'perforante' : trait).filter(Boolean);
};
const hasCanvasWeaponTrait = (weapon, trait) => getCanvasWeaponTraits(weapon).some(candidate => candidate === canvasAttackRules_normalizeText(trait));
const parseWeaponDiceProfile = function () {
  var _ref3, _ref4, _ref5, _ref6, _ref7, _weapon$defenseDicePr;
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const source = (_ref3 = (_ref4 = (_ref5 = (_ref6 = (_ref7 = (_weapon$defenseDicePr = weapon.defenseDiceProfile) !== null && _weapon$defenseDicePr !== void 0 ? _weapon$defenseDicePr : weapon.perfilDefensa) !== null && _ref7 !== void 0 ? _ref7 : weapon.dano) !== null && _ref6 !== void 0 ? _ref6 : weapon.damage) !== null && _ref5 !== void 0 ? _ref5 : weapon.poder) !== null && _ref4 !== void 0 ? _ref4 : weapon.power) !== null && _ref3 !== void 0 ? _ref3 : '';
  const matches = [...String(source).toLowerCase().matchAll(/(\d*)\s*d\s*(4|6|8|10|12|20)/g)];
  return matches.flatMap(match => {
    const count = Math.max(1, Math.min(6, canvasAttackRules_asInteger(match[1] || 1, 1)));
    const sides = canvasAttackRules_asInteger(match[2], 6);
    return Array.from({
      length: count
    }, (_, index) => ({
      id: "weapon-die-".concat(match.index, "-").concat(index),
      sides,
      die: "d".concat(sides)
    }));
  });
};
const getCanvasWeaponActionCost = function () {
  var _ref8, _ref9, _weapon$actionCost;
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let attacker = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  if ((attacker === null || attacker === void 0 ? void 0 : attacker.profileType) === 'rogueliteEnemy') return 0;
  if (weapon.attackMode === 'dual') return 2;
  const explicit = parseActionDiceCost((_ref8 = (_ref9 = (_weapon$actionCost = weapon.actionCost) !== null && _weapon$actionCost !== void 0 ? _weapon$actionCost : weapon.consumo) !== null && _ref9 !== void 0 ? _ref9 : weapon.cost) !== null && _ref8 !== void 0 ? _ref8 : weapon.coste, 1);
  return Math.max(hasCanvasWeaponTrait(weapon, 'pesada') ? 2 : 1, explicit);
};
const getTokenEquippedItems = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (Array.isArray(token.equippedItems) && !token.equipmentLoadout) return token.equippedItems.filter(item => item && typeof item === 'object').map(item => item.payload ? _objectSpread2(_objectSpread2({}, item.payload), item) : item);
  const loadout = token.equipmentLoadout || token.equippedItems || {};
  const activeSetIndex = Number(loadout.activeWeaponSet) === 1 ? 1 : 0;
  const activeSet = Array.isArray(loadout.weaponSets) ? loadout.weaponSets[activeSetIndex] || loadout.weaponSets[0] || {} : loadout;
  return [['mainHand', activeSet.mainHand], ['offHand', activeSet.offHand], ['body', loadout.body], ['accessory_1', loadout.accessory_1], ['accessory_2', loadout.accessory_2]].filter(_ref0 => {
    let [, item] = _ref0;
    return item;
  }).map(_ref1 => {
    let [canvasSlot, item] = _ref1;
    return _objectSpread2(_objectSpread2(_objectSpread2({}, item.payload), item), {}, {
      canvasSlot
    });
  });
};
const getCanvasWeaponIdentity = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return String(item.runItemId || item.instanceId || item.id || item.catalogId || item.name || item.nombre || '');
};
const isCanvasShield = function () {
  let item = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const source = item !== null && item !== void 0 && item.payload ? _objectSpread2(_objectSpread2({}, item.payload), item) : item;
  if ((source === null || source === void 0 ? void 0 : source.isShield) === true || (source === null || source === void 0 ? void 0 : source.shield) === true) return true;
  return [source === null || source === void 0 ? void 0 : source.type, source === null || source === void 0 ? void 0 : source.itemType, source === null || source === void 0 ? void 0 : source._category, source === null || source === void 0 ? void 0 : source.category, source === null || source === void 0 ? void 0 : source.subtype, source === null || source === void 0 ? void 0 : source.id, source === null || source === void 0 ? void 0 : source.catalogId, source === null || source === void 0 ? void 0 : source.equipmentType, source === null || source === void 0 ? void 0 : source.name, source === null || source === void 0 ? void 0 : source.nombre, ...getCanvasWeaponTraits(source || {})].some(value => /(^|\W)(escudos?|shields?)(\W|$)/.test(canvasAttackRules_normalizeText(value).replace(/_/g, ' ')));
};
const getCanvasCombatItems = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const equipped = getTokenEquippedItems(token);
  if (token.profileType !== 'rogueliteEnemy') return equipped;
  const seen = new Set();
  return [...(Array.isArray(token.inventory) ? token.inventory : []), ...equipped].filter(item => item && typeof item === 'object').map(item => item.payload ? _objectSpread2(_objectSpread2({}, item.payload), item) : item).filter(item => {
    const key = getCanvasWeaponIdentity(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const getCanvasEquippedWeapons = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return getCanvasCombatItems(token).filter(item => {
    if (token.profileType === 'rogueliteEnemy' && isCanvasShield(item)) return false;
    return [item === null || item === void 0 ? void 0 : item.type, item === null || item === void 0 ? void 0 : item._category, item === null || item === void 0 ? void 0 : item.category].some(value => ['weapon', 'arma', 'weapons', 'armas'].includes(canvasAttackRules_normalizeText(value)));
  });
};
const getCanvasDefensiveEquipment = function () {
  let token = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return getCanvasCombatItems(token).filter(item => {
    var _ref10, _item$type;
    if (token.profileType === 'rogueliteEnemy' && isCanvasShield(item)) return true;
    if (parseWeaponDiceProfile(item).length === 0) return false;
    const type = canvasAttackRules_normalizeText((_ref10 = (_item$type = item === null || item === void 0 ? void 0 : item.type) !== null && _item$type !== void 0 ? _item$type : item === null || item === void 0 ? void 0 : item._category) !== null && _ref10 !== void 0 ? _ref10 : item === null || item === void 0 ? void 0 : item.category);
    const traits = getCanvasWeaponTraits(item);
    return ['weapon', 'arma', 'weapons'].includes(type) || (item === null || item === void 0 ? void 0 : item.defenseDiceProfile) || (item === null || item === void 0 ? void 0 : item.perfilDefensa) || traits.some(trait => ['defensiva', 'defensivo', 'guardia', 'bloqueo', 'parada'].includes(trait));
  });
};
const resolveCanvasEnemyDefenseSelection = function () {
  let {
    token,
    equipmentIds = []
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const invalid = reason => ({
    legal: false,
    items: [],
    weapons: [],
    shield: null,
    cdBonus: 0,
    reason
  });
  if ((token === null || token === void 0 ? void 0 : token.profileType) !== 'rogueliteEnemy') return invalid('La selección de equipo corresponde a un enemigo.');
  if (!Array.isArray(equipmentIds)) return invalid('Selecciona equipo válido del enemigo.');
  const ids = equipmentIds.map(String);
  if (new Set(ids).size !== ids.length) return invalid('Cada copia del equipo solo puede utilizarse una vez.');
  const available = getCanvasDefensiveEquipment(token);
  const items = ids.map(id => available.find(item => getCanvasWeaponIdentity(item) === id));
  if (items.some(item => !item)) return invalid('Algún equipo ya no está disponible en el inventario.');
  const shields = items.filter(isCanvasShield);
  const weapons = items.filter(item => !isCanvasShield(item));
  if (shields.length > 1) return invalid('Solo puedes utilizar un escudo.');
  const hands = shields.length + weapons.reduce((sum, item) => sum + equipmentPool_resolveEquipmentHandsRequired(item), 0);
  if (hands > 2) return invalid('El equipo defensivo no puede ocupar más de dos manos.');
  return {
    legal: true,
    items,
    weapons,
    shield: shields[0] || null,
    cdBonus: shields.length ? 1 : 0,
    reason: ''
  };
};
const getDefaultCanvasEnemyDefenseSelection = token => {
  if ((token === null || token === void 0 ? void 0 : token.profileType) !== 'rogueliteEnemy') return [];
  const equipment = getCanvasDefensiveEquipment(token);
  const shield = equipment.find(isCanvasShield);
  const weapons = equipment.filter(item => !isCanvasShield(item));
  if (shield) {
    const weapon = weapons.find(item => equipmentPool_resolveEquipmentHandsRequired(item) === 1);
    return [shield, weapon].filter(Boolean).map(getCanvasWeaponIdentity);
  }
  return weapons[0] ? [getCanvasWeaponIdentity(weapons[0])] : [];
};
const toggleCanvasEnemyDefenseEquipment = function () {
  let {
    token,
    equipmentIds = [],
    itemId
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const equipment = getCanvasDefensiveEquipment(token);
  const id = String(itemId);
  const item = equipment.find(candidate => getCanvasWeaponIdentity(candidate) === id);
  if (!item || (token === null || token === void 0 ? void 0 : token.profileType) !== 'rogueliteEnemy') return equipmentIds;
  const ids = [...new Set(equipmentIds.map(String))];
  if (ids.includes(id)) return ids.filter(candidate => candidate !== id);
  const selected = ids.map(candidate => equipment.find(value => getCanvasWeaponIdentity(value) === candidate)).filter(Boolean);
  const oneHanded = selected.filter(candidate => !isCanvasShield(candidate) && equipmentPool_resolveEquipmentHandsRequired(candidate) === 1);
  if (isCanvasShield(item)) return [item, oneHanded[0]].filter(Boolean).map(getCanvasWeaponIdentity);
  if (equipmentPool_resolveEquipmentHandsRequired(item) === 2) return [id];
  const other = oneHanded[oneHanded.length - 1] || selected.find(isCanvasShield);
  return [other, item].filter(Boolean).map(getCanvasWeaponIdentity);
};
const getEnemyActiveDefenseEligibility = function () {
  let {
    token,
    participant
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!token || token.profileType !== 'rogueliteEnemy' || (participant === null || participant === void 0 ? void 0 : participant.side) !== 'enemies') {
    return {
      eligible: false,
      equipment: [],
      reason: 'El objetivo no es un enemigo.'
    };
  }
  const equipment = getCanvasDefensiveEquipment(token);
  const attackAction = (participant.enemyActions || []).find(action => action.id === 'attack');
  if (!attackAction || attackAction.status === 'spent') {
    return {
      eligible: false,
      equipment,
      reason: 'La acción principal del enemigo ya está gastada.'
    };
  }
  if (token.preventActiveDefense || token.cannotDefend || participant.preventActiveDefense) {
    return {
      eligible: false,
      equipment,
      reason: 'Una regla impide que este enemigo se defienda.'
    };
  }
  if (!equipment.some(item => !isCanvasShield(item))) {
    return {
      eligible: false,
      equipment,
      reason: 'No tiene un arma o equipo defensivo empuñado.'
    };
  }
  return {
    eligible: true,
    equipment,
    reason: ''
  };
};
const getRangeName = function () {
  var _ref11, _ref12, _ref13, _ref14, _weapon$alcance, _weapon$payload, _weapon$payload2;
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return canvasAttackRules_normalizeText((_ref11 = (_ref12 = (_ref13 = (_ref14 = (_weapon$alcance = weapon.alcance) !== null && _weapon$alcance !== void 0 ? _weapon$alcance : weapon.alc) !== null && _ref14 !== void 0 ? _ref14 : weapon.range) !== null && _ref13 !== void 0 ? _ref13 : (_weapon$payload = weapon.payload) === null || _weapon$payload === void 0 ? void 0 : _weapon$payload.alcance) !== null && _ref12 !== void 0 ? _ref12 : (_weapon$payload2 = weapon.payload) === null || _weapon$payload2 === void 0 ? void 0 : _weapon$payload2.range) !== null && _ref11 !== void 0 ? _ref11 : 'Toque');
};
const getRangeValue = function () {
  var _rangeName$match;
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const rangeName = getRangeName(weapon);
  const named = Object.entries(RANGE_VALUES).find(_ref15 => {
    let [name] = _ref15;
    return rangeName.includes(name);
  });
  if (named) return named[1];
  const numeric = Number.parseInt((_rangeName$match = rangeName.match(/\d+/)) === null || _rangeName$match === void 0 ? void 0 : _rangeName$match[0], 10);
  return Number.isFinite(numeric) ? numeric : RANGE_VALUES.toque;
};
const getCanvasWeaponRange = getRangeValue;
const isOneHanded = function () {
  let weapon = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return equipmentPool_resolveEquipmentHandsRequired(weapon) === 1;
};
const evaluateCanvasAttackRange = _ref16 => {
  let {
    attacker,
    target,
    weapon,
    items = [],
    gridConfig = {},
    deferThrownRange = true
  } = _ref16;
  if (!attacker || !target || !weapon) {
    return {
      legal: false,
      reason: 'Faltan atacante, objetivo o arma.'
    };
  }
  if (attacker.id === target.id || legacyCombatRules_areTokensAllied(attacker, target)) {
    return {
      legal: false,
      reason: 'El objetivo debe ser una criatura enemiga.'
    };
  }
  const distance = getTokenDistanceInCells(attacker, target, gridConfig);
  if (hasCanvasStatus(attacker, 'cegado') && distance > 0) {
    return {
      legal: false,
      distance,
      reason: 'Cegado: solo puedes elegir objetivos en tu misma casilla (Toque).'
    };
  }
  if (!canTokenSeeThroughSmoke(attacker, target, items)) {
    return {
      legal: false,
      distance,
      reason: 'El humo bloquea la línea de visión hacia ese objetivo.'
    };
  }
  const rangeName = getRangeName(weapon);
  const rangeValue = getRangeValue(weapon);
  const isThrown = deferThrownRange && hasCanvasWeaponTrait(weapon, 'arrojadiza');
  const attackerContext = getTokenCombatCellContext(attacker, items, gridConfig);
  const attackerInDuel = attackerContext.mode === 'duel';
  const duelist = hasCanvasWeaponTrait(weapon, 'duelista');
  if (attackerInDuel && hasCanvasWeaponTrait(weapon, 'a distancia')) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: 'No puedes utilizar un arma A distancia mientras estás en Duelo.'
    };
  }
  if (attackerInDuel && rangeValue >= RANGE_VALUES.intermedio) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: 'No puedes usar armas de alcance Intermedio o superior mientras estás en Duelo.'
    };
  }
  if (!isThrown && rangeValue === RANGE_VALUES.toque && distance === 1) {
    const touchException = canUseTouchAgainstAdjacentLockedTarget(attacker, target, gridConfig) || attacker.allowAdjacentTouchTraits === true || canvasAttackRules_normalizeText(attacker.classIdentity).includes('picaro');
    if (touchException) return {
      legal: true,
      distance,
      rangeName,
      suppressTraits: false,
      note: ''
    };
    if (!isOneHanded(weapon)) {
      return {
        legal: false,
        distance,
        rangeName,
        reason: 'A una casilla, un arma de Toque debe empuñarse a una mano.'
      };
    }
    return {
      legal: true,
      distance,
      rangeName,
      suppressTraits: true,
      note: 'Ataque de Toque a una casilla: los rasgos del arma no se resuelven.'
    };
  }
  if (!isThrown && distance > rangeValue) {
    return {
      legal: false,
      distance,
      rangeName,
      reason: "El objetivo est\xE1 a ".concat(distance, " casillas y el arma no alcanza.")
    };
  }
  const suppressTraits = attackerInDuel && rangeValue === RANGE_VALUES.cercano && !duelist;
  return {
    legal: true,
    distance,
    rangeName,
    suppressTraits,
    note: suppressTraits ? 'Ataque en Duelo: se ignoran los rasgos de resolución del arma.' : ''
  };
};
const getUsableAttackDice = function () {
  let participant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (participant.actionDice || []).filter(die => die.status === 'available');
};
const getUsableDefenseDice = function () {
  let participant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (participant.actionDice || []).filter(die => die.status === 'committed');
};
const getCanvasWeaponAvailability = _ref17 => {
  let {
    token,
    participant,
    weapon
  } = _ref17;
  if ((token === null || token === void 0 ? void 0 : token.profileType) === 'rogueliteEnemy') {
    const attackAction = ((participant === null || participant === void 0 ? void 0 : participant.enemyActions) || []).find(action => action.id === 'attack');
    return (attackAction === null || attackAction === void 0 ? void 0 : attackAction.status) === 'spent' ? {
      available: false,
      reason: 'La acción de ataque del enemigo ya está gastada.'
    } : {
      available: true,
      cost: 0,
      reason: ''
    };
  }
  const cost = getCanvasWeaponActionCost(weapon, token);
  const available = getUsableAttackDice(participant).length;
  return available >= cost ? {
    available: true,
    cost,
    reason: ''
  } : {
    available: false,
    cost,
    reason: "Necesitas ".concat(cost, " dados de acci\xF3n disponibles; te quedan ").concat(available, ".")
  };
};
const rollWeaponDice = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let random = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random;
  return profile.map(_ref18 => {
    let {
      sides
    } = _ref18;
    return Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * sides) + 1;
  });
};
const rollCanvasThreatDie = function () {
  let {
    threatMode = 'none',
    storedThreatValue = null,
    storedThreatDie = null,
    customThreatSides = 6,
    random = Math.random
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const canUseStoredThreat = threatMode === 'stored' && storedThreatValue !== null && storedThreatValue !== undefined && Number.isFinite(Number(storedThreatValue));
  const customSides = [4, 6, 8, 10, 12, 20].includes(Number(customThreatSides)) ? Number(customThreatSides) : 6;
  if (canUseStoredThreat) {
    var _String$match;
    const storedSides = Number.parseInt((_String$match = String(storedThreatDie || '').match(/\d+/)) === null || _String$match === void 0 ? void 0 : _String$match[0], 10);
    return _objectSpread2(_objectSpread2({
      die: storedThreatDie || 'Amenaza'
    }, Number.isFinite(storedSides) ? {
      sides: storedSides
    } : {}), {}, {
      value: Number(storedThreatValue),
      source: 'stored'
    });
  }
  if (threatMode === 'custom') {
    return {
      die: "d".concat(customSides),
      sides: customSides,
      value: rollWeaponDice([{
        sides: customSides
      }], random)[0],
      source: 'custom'
    };
  }
  return null;
};

// Arrojadiza uses the committed resource rather than the weapon's printed
// range. A multi-die attack may use its highest visible die for reach, while
// an enemy uses its Base ofensiva (Threat only adds Pressure).
const evaluateCanvasThrownRange = function () {
  var _attacker$offenseBase, _attacker$stats, _attacker$stats$ofens;
  let {
    attacker,
    weapon,
    actionDice = [],
    distance = 0,
    suppressTraits = false
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'arrojadiza')) {
    return {
      thrown: false,
      legal: true,
      maxRange: null,
      distance
    };
  }
  const maxRange = (attacker === null || attacker === void 0 ? void 0 : attacker.profileType) === 'rogueliteEnemy' ? Math.max(0, canvasAttackRules_asInteger((_attacker$offenseBase = attacker.offenseBase) !== null && _attacker$offenseBase !== void 0 ? _attacker$offenseBase : (_attacker$stats = attacker.stats) === null || _attacker$stats === void 0 ? void 0 : (_attacker$stats$ofens = _attacker$stats.ofensiva) === null || _attacker$stats$ofens === void 0 ? void 0 : _attacker$stats$ofens.current, 0)) : Math.max(0, ...actionDice.map(die => Math.max(0, canvasAttackRules_asInteger(die.value, 0))));
  return {
    thrown: true,
    legal: distance <= maxRange,
    maxRange,
    distance,
    reason: distance > maxRange ? "Arrojadiza: el objetivo est\xE1 a ".concat(distance, " casillas y el lanzamiento alcanza ").concat(maxRange, ".") : ''
  };
};
const THREAT_DIE_SIDES = [4, 6, 8, 10, 12, 20];
const normalizeCanvasThreatSelection = function () {
  let {
    threatSelection,
    threatMode = 'none',
    customThreatSides = 6,
    useThreat = false
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (threatSelection && typeof threatSelection === 'object') {
    return {
      useStored: threatSelection.useStored === true,
      customDice: (Array.isArray(threatSelection.customDice) ? threatSelection.customDice : []).map(Number).filter(sides => THREAT_DIE_SIDES.includes(sides))
    };
  }
  const mode = threatMode === 'none' && useThreat ? 'stored' : threatMode;
  return {
    useStored: mode === 'stored',
    customDice: mode === 'custom' ? [THREAT_DIE_SIDES.includes(Number(customThreatSides)) ? Number(customThreatSides) : 6] : []
  };
};
const rollCanvasThreatDice = function () {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const selection = normalizeCanvasThreatSelection(options);
  const dice = [];
  if (selection.useStored) {
    var _stored$sides;
    const stored = rollCanvasThreatDie(_objectSpread2(_objectSpread2({}, options), {}, {
      threatMode: 'stored'
    }));
    if (stored) dice.push(_objectSpread2(_objectSpread2({}, stored), {}, {
      id: 'threat-stored',
      sides: (_stored$sides = stored.sides) !== null && _stored$sides !== void 0 ? _stored$sides : null
    }));
  }
  selection.customDice.forEach((sides, index) => {
    const die = rollCanvasThreatDie(_objectSpread2(_objectSpread2({}, options), {}, {
      threatMode: 'custom',
      customThreatSides: sides
    }));
    dice.push(_objectSpread2(_objectSpread2({}, die), {}, {
      id: "threat-custom-".concat(index)
    }));
  });
  return dice;
};

// New arrays are authoritative, including an explicitly empty selection. Older
// pending attacks reused threatUsed for the defender after the defense roll.
const getCanvasAttackThreatDice = function () {
  var _pending$defenseDice;
  let pending = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (Array.isArray(pending === null || pending === void 0 ? void 0 : pending.attackThreatDice)) return pending.attackThreatDice;
  const legacy = (pending === null || pending === void 0 ? void 0 : pending.attackThreatUsed) || ((pending === null || pending === void 0 ? void 0 : pending.status) !== 'defense-rolled' && !(pending !== null && pending !== void 0 && pending.defenseItem) && !(pending !== null && pending !== void 0 && (_pending$defenseDice = pending.defenseDice) !== null && _pending$defenseDice !== void 0 && _pending$defenseDice.length) ? pending === null || pending === void 0 ? void 0 : pending.threatUsed : null);
  return legacy ? [_objectSpread2(_objectSpread2({}, legacy), {}, {
    id: legacy.id || "attack-threat-".concat((pending === null || pending === void 0 ? void 0 : pending.id) || 'legacy')
  })] : [];
};
const getCanvasDefenseThreatDice = function () {
  var _pending$defenseDice2;
  let pending = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (Array.isArray(pending === null || pending === void 0 ? void 0 : pending.defenseThreatDice)) return pending.defenseThreatDice;
  const legacy = pending !== null && pending !== void 0 && pending.threatUsed && (pending.status === 'defense-rolled' || pending.defenseItem || (_pending$defenseDice2 = pending.defenseDice) !== null && _pending$defenseDice2 !== void 0 && _pending$defenseDice2.length) ? pending.threatUsed : null;
  return legacy ? [_objectSpread2(_objectSpread2({}, legacy), {}, {
    id: legacy.id || "defense-threat-".concat((pending === null || pending === void 0 ? void 0 : pending.id) || 'legacy')
  })] : [];
};
const rollCanvasEnemyDefense = function () {
  let {
    equipment,
    equipments,
    threatSelection,
    threatMode = 'none',
    storedThreatValue = null,
    storedThreatDie = null,
    customThreatSides = 6,
    useThreat = false,
    random = Math.random
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const items = Array.isArray(equipments) ? equipments : Array.isArray(equipment) ? equipment : [equipment].filter(Boolean);
  const profile = items.filter(item => !isCanvasShield(item)).flatMap((item, index) => parseWeaponDiceProfile(item).map(die => _objectSpread2(_objectSpread2({}, die), {}, {
    weaponId: getCanvasWeaponIdentity(item) || "defense-equipment-".concat(index),
    weaponName: item.name || item.nombre || 'Equipo defensivo'
  })));
  const values = rollWeaponDice(profile, random);
  const defenseDice = profile.map((die, index) => ({
    id: "enemy-defense-".concat(index),
    die: die.die,
    sides: die.sides,
    value: values[index],
    weaponId: die.weaponId,
    weaponName: die.weaponName
  }));
  const defenseThreatDice = rollCanvasThreatDice({
    threatSelection,
    threatMode,
    storedThreatValue,
    storedThreatDie,
    customThreatSides,
    useThreat,
    random
  });
  const threatUsed = defenseThreatDice.length === 1 ? defenseThreatDice[0] : null;
  const totalDefense = [...defenseDice, ...defenseThreatDice].reduce((sum, die) => sum + die.value, 0);
  return {
    defenseDice,
    defenseThreatDice,
    threatUsed,
    totalDefense,
    consumedStoredThreat: defenseThreatDice.some(die => die.source === 'stored')
  };
};
const validateWeaponResults = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let values = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return profile.length > 0 && profile.length === values.length && profile.every((_ref19, index) => {
    let {
      sides
    } = _ref19;
    const value = Number(values[index]);
    return Number.isInteger(value) && value >= 1 && value <= sides;
  });
};
const getCriticalDieSides = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let values = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let weapon = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let suppressTraits = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'critico')) return null;
  const criticalIndex = profile.findIndex((_ref20, index) => {
    let {
      sides,
      noCritical
    } = _ref20;
    return !noCritical && Number(values[index]) === sides;
  });
  return criticalIndex >= 0 ? profile[criticalIndex].sides : null;
};
const rollCriticalWeaponDice = function () {
  let profile = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let values = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let weapon = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let suppressTraits = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let random = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : Math.random;
  if (suppressTraits || !hasCanvasWeaponTrait(weapon, 'critico')) return [];
  return profile.flatMap((_ref21, index) => {
    let {
      sides
    } = _ref21;
    if (profile[index].noCritical || Number(values[index]) !== sides) return [];
    const chain = [];
    let result = sides;
    while (result === sides) {
      result = rollWeaponDice([{
        sides
      }], random)[0];
      chain.push({
        sides,
        value: result,
        sourceIndex: index
      });
    }
    return chain;
  });
};
const calculateCanvasAttackPressure = _ref22 => {
  var _attacker$offenseBase2, _attacker$stats2, _attacker$stats2$ofen;
  let {
    attacker,
    actionDice = [],
    weaponResults = [],
    criticalResult = 0,
    criticalResults = [],
    threatValue = 0,
    threatDice,
    distance = 0,
    weapon,
    suppressTraits = false
  } = _ref22;
  const actionPressure = (attacker === null || attacker === void 0 ? void 0 : attacker.profileType) === 'rogueliteEnemy' ? Math.max(0, canvasAttackRules_asInteger((_attacker$offenseBase2 = attacker.offenseBase) !== null && _attacker$offenseBase2 !== void 0 ? _attacker$offenseBase2 : (_attacker$stats2 = attacker.stats) === null || _attacker$stats2 === void 0 ? void 0 : (_attacker$stats2$ofen = _attacker$stats2.ofensiva) === null || _attacker$stats2$ofen === void 0 ? void 0 : _attacker$stats2$ofen.current, 0)) : actionDice.reduce((sum, die) => sum + Math.max(0, canvasAttackRules_asInteger(die.value, 0)), 0);
  const threatPressure = (attacker === null || attacker === void 0 ? void 0 : attacker.profileType) === 'rogueliteEnemy' ? Array.isArray(threatDice) ? threatDice.reduce((sum, die) => sum + Math.max(0, canvasAttackRules_asInteger(die.value, 0)), 0) : Math.max(0, canvasAttackRules_asInteger(threatValue, 0)) : 0;
  const criticalPressure = criticalResults.length > 0 ? criticalResults.reduce((sum, result) => {
    var _result$value;
    return sum + Math.max(0, canvasAttackRules_asInteger((_result$value = result === null || result === void 0 ? void 0 : result.value) !== null && _result$value !== void 0 ? _result$value : result, 0));
  }, 0) : Math.max(0, canvasAttackRules_asInteger(criticalResult, 0));
  const weaponPressure = weaponResults.reduce((sum, value) => sum + Math.max(0, canvasAttackRules_asInteger(value, 0)), 0) + criticalPressure;
  const thrownPenalty = !suppressTraits && hasCanvasWeaponTrait(weapon, 'arrojadiza') ? Math.max(0, canvasAttackRules_asInteger(distance, 0)) : 0;
  return {
    actionPressure,
    threatPressure,
    weaponPressure,
    thrownPenalty,
    total: Math.max(0, actionPressure + threatPressure + weaponPressure - thrownPenalty)
  };
};
const resolveCanvasAttackDamage = _ref23 => {
  var _target$stats$cd$curr, _target$stats, _target$stats$cd, _target$stats2, _target$stats2$cd, _target$stats3, _target$stats3$vida;
  let {
    attackPressure,
    defenseDice = [],
    target,
    weapon,
    suppressTraits = false,
    defenseCdBonus = 0
  } = _ref23;
  const defense = weapon !== null && weapon !== void 0 && weapon.preventsActiveDefense ? 0 : defenseDice.reduce((sum, die) => sum + Math.max(0, canvasAttackRules_asInteger(die.value, 0)), 0);
  const finalPressure = Math.max(0, canvasAttackRules_asInteger(attackPressure, 0) - defense);
  const surplus = Math.max(0, defense - canvasAttackRules_asInteger(attackPressure, 0));
  const baseCd = Math.max(1, canvasAttackRules_asInteger((_target$stats$cd$curr = target === null || target === void 0 ? void 0 : (_target$stats = target.stats) === null || _target$stats === void 0 ? void 0 : (_target$stats$cd = _target$stats.cd) === null || _target$stats$cd === void 0 ? void 0 : _target$stats$cd.current) !== null && _target$stats$cd$curr !== void 0 ? _target$stats$cd$curr : target === null || target === void 0 ? void 0 : (_target$stats2 = target.stats) === null || _target$stats2 === void 0 ? void 0 : (_target$stats2$cd = _target$stats2.cd) === null || _target$stats2$cd === void 0 ? void 0 : _target$stats2$cd.max, 1));
  const shieldBonus = (target === null || target === void 0 ? void 0 : target.profileType) === 'rogueliteEnemy' ? Math.min(1, Math.max(0, canvasAttackRules_asInteger(defenseCdBonus, 0))) : 0;
  const barrierBonus = getArcaneBarrierBonus(target);
  const protectedCd = baseCd + shieldBonus + barrierBonus;
  const effectiveCd = !suppressTraits && hasCanvasWeaponTrait(weapon, 'perforante') ? Math.max(1, protectedCd - 1) : protectedCd;
  const currentLife = Math.max(0, canvasAttackRules_asInteger(target === null || target === void 0 ? void 0 : (_target$stats3 = target.stats) === null || _target$stats3 === void 0 ? void 0 : (_target$stats3$vida = _target$stats3.vida) === null || _target$stats3$vida === void 0 ? void 0 : _target$stats3$vida.current, 0));
  const temporaryLife = getTemporaryLife(target);
  const damageBlocks = Math.floor(finalPressure / effectiveCd);
  const weaknessValues = [target === null || target === void 0 ? void 0 : target.weaknesses, target === null || target === void 0 ? void 0 : target.weakness, target === null || target === void 0 ? void 0 : target.debilidades, target === null || target === void 0 ? void 0 : target.debilidad].flatMap(value => Array.isArray(value) ? value : value ? [value] : []).map(value => canvasAttackRules_normalizeText(typeof value === 'string' ? value : (value === null || value === void 0 ? void 0 : value.id) || (value === null || value === void 0 ? void 0 : value.name) || (value === null || value === void 0 ? void 0 : value.label)));
  const weaknessTags = [target === null || target === void 0 ? void 0 : target.tags, target === null || target === void 0 ? void 0 : target.traits, target === null || target === void 0 ? void 0 : target.rasgos].flatMap(value => Array.isArray(value) ? value : value ? [value] : []).map(value => canvasAttackRules_normalizeText(typeof value === 'string' ? value : (value === null || value === void 0 ? void 0 : value.id) || (value === null || value === void 0 ? void 0 : value.name) || (value === null || value === void 0 ? void 0 : value.label)));
  const weakToFire = weaknessValues.some(value => ['fuego', 'fire', 'debilidad: fuego'].includes(value)) || weaknessTags.some(value => /(?:debilidad|weakness)\s*:\s*(?:fuego|fire)(?:\s|$)/.test(value));
  const fireWeaknessBonus = damageBlocks > 0 && weakToFire && hasCanvasWeaponTrait(weapon, 'fuego') ? Math.min(1, Math.max(0, currentLife + temporaryLife - damageBlocks)) : 0;
  const temporaryLifeLost = Math.min(temporaryLife, damageBlocks + fireWeaknessBonus);
  const normalLifeLost = Math.min(currentLife, damageBlocks + fireWeaknessBonus - temporaryLifeLost);
  const lifeLost = normalLifeLost + temporaryLifeLost;
  return _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({
    defense,
    finalPressure,
    surplus,
    baseCd,
    shieldBonus
  }, barrierBonus ? {
    barrierBonus
  } : {}), {}, {
    effectiveCd,
    lifeLost
  }, fireWeaknessBonus ? {
    fireWeaknessBonus
  } : {}), temporaryLife > 0 ? {
    temporaryLifeLost,
    normalLifeLost,
    nextTemporaryLife: temporaryLife - temporaryLifeLost
  } : {}), {}, {
    nextLife: Math.max(0, currentLife - normalLifeLost)
  });
};

/** Surplus counterattacks require equipped reach, but no action dice or weapon roll. */
const getCanvasCounterattackWeapons = _ref24 => {
  let {
    defender,
    attacker,
    items = [],
    gridConfig = {}
  } = _ref24;
  if (!defender || !attacker) return [];
  return getCanvasEquippedWeapons(defender).filter(weapon => evaluateCanvasAttackRange({
    attacker: defender,
    target: attacker,
    weapon,
    items,
    gridConfig,
    deferThrownRange: false
  }).legal);
};
const getPreferredCanvasCounterattackWeapon = function () {
  let {
    pending,
    participant,
    weapons = []
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const defenseItems = [...(Array.isArray(pending === null || pending === void 0 ? void 0 : pending.defenseItems) ? pending.defenseItems : []), pending === null || pending === void 0 ? void 0 : pending.defenseItem].filter(Boolean);
  const preferredIds = [...defenseItems.map(item => getCanvasWeaponIdentity(item.weapon || item)), ...(Array.isArray(participant === null || participant === void 0 ? void 0 : participant.lastAttackWeaponIds) ? participant.lastAttackWeaponIds.map(String) : [])];
  for (const id of preferredIds) {
    const weapon = weapons.find(item => getCanvasWeaponIdentity(item) === id);
    if (weapon) return weapon;
  }
  return weapons[0] || null;
};
;// ./src/features/canvas/combat/canvasArmorRules.js



const canvasArmorRules_key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const traitKey = value => ['perforacion', 'penetrante'].includes(canvasArmorRules_key(value)) ? 'perforante' : canvasArmorRules_key(value);
const CANVAS_MUTABLE_PROTECTIONS = ['critico', 'perforante', 'conmocion', 'empuje'];
const getCanvasEquippedArmor = token => {
  var _token$equipmentLoado;
  const body = token === null || token === void 0 ? void 0 : (_token$equipmentLoado = token.equipmentLoadout) === null || _token$equipmentLoado === void 0 ? void 0 : _token$equipmentLoado.body;
  if (token !== null && token !== void 0 && token.equipmentLoadout) return body ? _objectSpread2(_objectSpread2({}, body.payload), body) : null;
  return resolveEquippedArmor(token);
};
const hasCanvasMutableArmor = token => {
  if ((token === null || token === void 0 ? void 0 : token.rulesSystem) === 'campaign') return false;
  const armor = getCanvasEquippedArmor(token);
  return armorSystem_getItemTraits(armor).some(trait => /adaptativa|mutable/.test(canvasArmorRules_key(trait))) || canvasArmorRules_key((armor === null || armor === void 0 ? void 0 : armor.name) || (armor === null || armor === void 0 ? void 0 : armor.nombre)).includes('tunica arcana');
};

// Canvas armor has no durability pool. Only the equipped piece grants protection.
// Explicit family metadata wins; the common arsenal supplies a fallback for older copies.
const isCanvasCuttingAttack = weapon => {
  const family = canvasArmorRules_key((weapon === null || weapon === void 0 ? void 0 : weapon.damageFamily) || (weapon === null || weapon === void 0 ? void 0 : weapon.damageType) || (weapon === null || weapon === void 0 ? void 0 : weapon.tipoDano));
  if (family) return family === 'cortante';
  const traits = armorSystem_getItemTraits(weapon).map(canvasArmorRules_key);
  if (traits.some(trait => trait.includes('catalizador'))) return false;
  return traits.includes('cortante') || /^(daga|espada|cimitarra|mandoble)(\s|$)/.test(canvasArmorRules_key((weapon === null || weapon === void 0 ? void 0 : weapon.name) || (weapon === null || weapon === void 0 ? void 0 : weapon.nombre)));
};
const getCanvasArmorProtection = (token, weapon) => {
  const armor = getCanvasEquippedArmor(token);
  const barrierTraits = getArcaneBarrierProtections(token);
  if (!armor) return {
    activeArmor: null,
    negatedTraits: barrierTraits
  };
  const name = canvasArmorRules_key(armor.name || armor.nombre);
  let traits = armorSystem_getItemTraits(armor).map(traitKey).filter(trait => CANVAS_MUTABLE_PROTECTIONS.includes(trait));
  if (hasCanvasMutableArmor(token)) {
    traits = CANVAS_MUTABLE_PROTECTIONS.includes(token.armorProtectionChoice) ? [token.armorProtectionChoice] : [];
  } else if (/gambeson/.test(name)) traits = ['conmocion'];else if (/malla/.test(name)) traits = isCanvasCuttingAttack(weapon) ? ['critico'] : [];else if (/escamas/.test(name)) traits = ['perforante'];else if (/placas/.test(name)) traits = ['empuje'];
  const suppressed = (token.suppressedArmorTraits || []).map(traitKey);
  return {
    activeArmor: armor,
    negatedTraits: [...new Set([...traits.filter(trait => !suppressed.includes(trait)), ...barrierTraits])]
  };
};
;// ./src/features/roguelite/progression.js

const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const cloneLevels = levels => levels.map(level => _objectSpread2(_objectSpread2({}, level), {}, {
  effects: Array.isArray(level.effects) ? level.effects.map(effect => _objectSpread2({}, effect)) : undefined,
  additionalFeatures: Array.isArray(level.additionalFeatures) ? level.additionalFeatures.map(feature => _objectSpread2({}, feature)) : []
}));
const ROGUELITE_LEVEL_EFFECT_TARGETS = Object.freeze([{
  key: 'life.max',
  label: 'Vida máxima',
  tone: 'life'
}, {
  key: 'defense.max',
  label: 'CD máxima',
  tone: 'defense'
}, {
  key: 'movement.max',
  label: 'Movimiento',
  tone: 'movement'
}, {
  key: 'initiative.max',
  label: 'Iniciativa',
  tone: 'initiative'
}, {
  key: 'resource.max',
  label: 'Recurso máximo',
  tone: 'resource'
}, {
  key: 'custom',
  label: 'Mejora personalizada',
  tone: 'custom'
}]);
const EFFECT_TARGET_KEYS = new Set(ROGUELITE_LEVEL_EFFECT_TARGETS.map(_ref => {
  let {
    key
  } = _ref;
  return key;
}));
const normalizeEffectOperation = value => value === 'set' ? 'set' : 'add';
const normalizeEffectColor = value => {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '';
};
const normalizeRogueliteLevelEffect = function (effect) {
  let index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const source = effect && typeof effect === 'object' ? effect : {};
  const target = EFFECT_TARGET_KEYS.has(source.target) ? source.target : 'custom';
  const parsedValue = Number(source.value);
  return {
    id: String(source.id || "effect-".concat(index + 1)),
    target,
    operation: normalizeEffectOperation(source.operation),
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    label: target === 'custom' ? String(source.label || 'Nueva mejora') : '',
    color: target === 'custom' ? normalizeEffectColor(source.color) : ''
  };
};
const LEGACY_EFFECT_FIELDS = Object.freeze([{
  field: 'maxLife',
  target: 'life.max'
}, {
  field: 'defenseClass',
  target: 'defense.max'
}, {
  field: 'movement',
  target: 'movement.max'
}, {
  field: 'initiative',
  target: 'initiative.max'
}, {
  field: 'resourceMaximum',
  target: 'resource.max'
}]);
const deriveLegacyEffects = (level, index, levels) => {
  if (index <= 0 || !Array.isArray(levels)) return [];
  const previousLevel = levels[index - 1] || {};
  return LEGACY_EFFECT_FIELDS.flatMap(_ref2 => {
    let {
      field,
      target
    } = _ref2;
    const currentValue = toOptionalNumber(level === null || level === void 0 ? void 0 : level[field]);
    const previousValue = toOptionalNumber(previousLevel === null || previousLevel === void 0 ? void 0 : previousLevel[field]);
    if (currentValue === null || previousValue === null || currentValue === previousValue) return [];
    return [{
      id: "legacy-".concat(target.replace('.', '-')),
      target,
      operation: 'add',
      value: currentValue - previousValue,
      label: ''
    }];
  });
};
const getRogueliteLevelEffects = function (level) {
  let index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let levels = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  if (Array.isArray(level === null || level === void 0 ? void 0 : level.effects)) {
    return level.effects.map(normalizeRogueliteLevelEffect);
  }
  return deriveLegacyEffects(level, index, levels).map(normalizeRogueliteLevelEffect);
};
const getRogueliteEffectDefinition = target => ROGUELITE_LEVEL_EFFECT_TARGETS.find(definition => definition.key === target) || ROGUELITE_LEVEL_EFFECT_TARGETS.at(-1);
const getRogueliteEffectLabel = function (effect) {
  let resourceName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'Recurso';
  const normalized = normalizeRogueliteLevelEffect(effect);
  if (normalized.target === 'resource.max') return "".concat(resourceName, " m\xE1ximo");
  if (normalized.target === 'custom') return normalized.label || 'Mejora personalizada';
  return getRogueliteEffectDefinition(normalized.target).label;
};
const describeRogueliteLevelEffect = function (effect) {
  let resourceName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'Recurso';
  const normalized = normalizeRogueliteLevelEffect(effect);
  const label = getRogueliteEffectLabel(normalized, resourceName);
  const value = normalized.operation === 'set' ? "se fija en ".concat(normalized.value) : "".concat(normalized.value >= 0 ? '+' : '').concat(normalized.value);
  return "".concat(label, ": ").concat(value);
};
const DOCUMENTED_BARBARIAN_LEVELS = Object.freeze([{
  title: 'Furia',
  description: 'Obtienes el núcleo completo de Furia descrito para la clase.',
  maxLife: 8,
  movement: 2,
  resourceMaximum: 3
}, {
  title: 'Sed de batalla',
  description: 'Al comenzar cada combate, obtienes 1 dado de Furia.',
  maxLife: 8,
  movement: 2,
  resourceMaximum: 3
}, {
  title: 'Movimiento salvaje',
  description: 'Una vez por turno, puedes gastar 1 de Furia para duplicar tu Movimiento durante ese turno, sin gastar un dado de acción.',
  maxLife: 8,
  movement: 2,
  resourceMaximum: 3
}, {
  title: 'Mejora de vida',
  description: 'Tu Vida máxima aumenta en 1 bloque y tu Movimiento aumenta en 1 casilla.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 3
}, {
  title: 'Mejora de Furia',
  description: 'Tu reserva máxima de Furia aumenta de 3 a 4 dados.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}, {
  title: 'Furia desatada',
  description: 'Una vez por ronda, cuando gastes Furia para potenciar un ataque, puedes gastar un segundo dado de Furia y añadir también su resultado a la Presión.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}, {
  title: 'Instinto de supervivencia',
  description: 'Ante un ataque, puedes gastar 1 de Furia para añadir a la defensa el dado de un arma empuñada, sin consumir otro dado reservado. Este dado todavía no puede activar Crítico.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}, {
  title: 'Crítico salvaje',
  description: 'El dado de arma añadido por Instinto de supervivencia puede activar Crítico. Su explosión aumenta la defensa y el posible excedente defensivo.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}, {
  title: 'Furia temeraria',
  description: 'Cuando te Expongas, puedes hacer que el enemigo añada 2d6 a la Presión en lugar de 1d6. Si lo haces, obtienes 2 de Furia en lugar de 1 después del ataque.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}, {
  title: 'Último aliento',
  description: 'Cuando un ataque fuese a reducir tu Vida a 0, puedes gastar cualquier cantidad de Furia. Por cada Furia gastada, reduces en 1 los bloques de Vida que perderías.',
  maxLife: 9,
  movement: 3,
  resourceMaximum: 4
}]);
const getDocumentedLevels = function () {
  let classItem = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const identity = "".concat(normalizeName(classItem.id), " ").concat(normalizeName(classItem.name));
  return identity.includes('barbar') ? DOCUMENTED_BARBARIAN_LEVELS : null;
};
const toOptionalNumber = value => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};
const normalizeRogueliteProgressionLevel = function (level, index) {
  var _ref3, _source$maxLife, _source$movement, _ref4, _source$resourceMaxim;
  let levels = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  const source = level && typeof level === 'object' ? level : {
    description: String(level || '')
  };
  return _objectSpread2(_objectSpread2({}, source), {}, {
    title: String(source.title || "Nivel ".concat(index + 1, " \u2014 Nuevo avance")).trim(),
    description: String(source.description || '').trim(),
    maxLife: toOptionalNumber((_ref3 = (_source$maxLife = source.maxLife) !== null && _source$maxLife !== void 0 ? _source$maxLife : source.life) !== null && _ref3 !== void 0 ? _ref3 : source.vida),
    movement: toOptionalNumber((_source$movement = source.movement) !== null && _source$movement !== void 0 ? _source$movement : source.movimiento),
    resourceMaximum: toOptionalNumber((_ref4 = (_source$resourceMaxim = source.resourceMaximum) !== null && _source$resourceMaxim !== void 0 ? _source$resourceMaxim : source.resourceMax) !== null && _ref4 !== void 0 ? _ref4 : source.furiaMaxima),
    effects: getRogueliteLevelEffects(source, index, levels),
    completed: Boolean(source.completed),
    acquired: Boolean(source.acquired),
    additionalFeatures: Array.isArray(source.additionalFeatures) ? source.additionalFeatures.map(feature => _objectSpread2({}, feature)) : []
  });
};
const resolveRogueliteClassLevels = function () {
  var _classItem$rogueliteP, _ref5, _rogueliteRules$progr, _rogueliteRules$progr2;
  let classItem = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const rogueliteRules = classItem.roguelite || {};
  const configured = Boolean((_classItem$rogueliteP = classItem.rogueliteProgressionConfigured) !== null && _classItem$rogueliteP !== void 0 ? _classItem$rogueliteP : rogueliteRules.progressionConfigured);
  const explicitLevels = (_ref5 = (_rogueliteRules$progr = (_rogueliteRules$progr2 = rogueliteRules.progression) === null || _rogueliteRules$progr2 === void 0 ? void 0 : _rogueliteRules$progr2.levels) !== null && _rogueliteRules$progr !== void 0 ? _rogueliteRules$progr : rogueliteRules.classLevels) !== null && _ref5 !== void 0 ? _ref5 : classItem.classLevels;
  const documentedLevels = getDocumentedLevels(classItem);
  const sourceLevels = !configured && documentedLevels ? documentedLevels : Array.isArray(explicitLevels) ? explicitLevels : [];
  const clonedLevels = cloneLevels(sourceLevels);
  return clonedLevels.map((level, index) => normalizeRogueliteProgressionLevel(level, index, clonedLevels));
};
const applyNumericEffect = (currentValue, effect) => {
  const base = Number(currentValue) || 0;
  return effect.operation === 'set' ? effect.value : base + effect.value;
};
const applyRogueliteLevelEffects = function () {
  var _classDefinition$maxL, _classDefinition$rogu, _ref6, _ref7, _classDefinition$maxD, _classDefinition$rogu2, _classDefinition$rogu3, _ref8, _ref9, _classDefinition$maxM, _classDefinition$rogu4, _classDefinition$rogu5, _ref0, _ref1, _classDefinition$maxI, _classDefinition$rogu6, _classDefinition$rogu7, _classDefinition$rogu8;
  let classDefinition = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  const levels = Array.isArray(classDefinition.classLevels) ? classDefinition.classLevels : [];
  const maximumLevel = Math.max(1, levels.length || 1);
  const resolvedLevel = Math.min(maximumLevel, Math.max(1, Math.trunc(Number(level) || 1)));
  const result = {
    maxLife: Number((_classDefinition$maxL = classDefinition.maxLife) !== null && _classDefinition$maxL !== void 0 ? _classDefinition$maxL : (_classDefinition$rogu = classDefinition.roguelite) === null || _classDefinition$rogu === void 0 ? void 0 : _classDefinition$rogu.maxLife) || 0,
    maxDefenseClass: Number((_ref6 = (_ref7 = (_classDefinition$maxD = classDefinition.maxDefenseClass) !== null && _classDefinition$maxD !== void 0 ? _classDefinition$maxD : classDefinition.defenseClass) !== null && _ref7 !== void 0 ? _ref7 : (_classDefinition$rogu2 = classDefinition.roguelite) === null || _classDefinition$rogu2 === void 0 ? void 0 : _classDefinition$rogu2.maxDefenseClass) !== null && _ref6 !== void 0 ? _ref6 : (_classDefinition$rogu3 = classDefinition.roguelite) === null || _classDefinition$rogu3 === void 0 ? void 0 : _classDefinition$rogu3.defenseClass) || 0,
    maxMovement: Number((_ref8 = (_ref9 = (_classDefinition$maxM = classDefinition.maxMovement) !== null && _classDefinition$maxM !== void 0 ? _classDefinition$maxM : classDefinition.movement) !== null && _ref9 !== void 0 ? _ref9 : (_classDefinition$rogu4 = classDefinition.roguelite) === null || _classDefinition$rogu4 === void 0 ? void 0 : _classDefinition$rogu4.maxMovement) !== null && _ref8 !== void 0 ? _ref8 : (_classDefinition$rogu5 = classDefinition.roguelite) === null || _classDefinition$rogu5 === void 0 ? void 0 : _classDefinition$rogu5.movement) || 0,
    maxInitiative: Number((_ref0 = (_ref1 = (_classDefinition$maxI = classDefinition.maxInitiative) !== null && _classDefinition$maxI !== void 0 ? _classDefinition$maxI : classDefinition.initiativeBase) !== null && _ref1 !== void 0 ? _ref1 : (_classDefinition$rogu6 = classDefinition.roguelite) === null || _classDefinition$rogu6 === void 0 ? void 0 : _classDefinition$rogu6.maxInitiative) !== null && _ref0 !== void 0 ? _ref0 : (_classDefinition$rogu7 = classDefinition.roguelite) === null || _classDefinition$rogu7 === void 0 ? void 0 : _classDefinition$rogu7.initiativeBase) || 0,
    resource: _objectSpread2(_objectSpread2({}, ((_classDefinition$rogu8 = classDefinition.roguelite) === null || _classDefinition$rogu8 === void 0 ? void 0 : _classDefinition$rogu8.resource) || {}), classDefinition.resource || {})
  };
  levels.slice(0, resolvedLevel).forEach((progressionLevel, index) => {
    getRogueliteLevelEffects(progressionLevel, index, levels).forEach(rawEffect => {
      const effect = normalizeRogueliteLevelEffect(rawEffect);
      if (effect.target === 'life.max') result.maxLife = applyNumericEffect(result.maxLife, effect);
      if (effect.target === 'defense.max') result.maxDefenseClass = applyNumericEffect(result.maxDefenseClass, effect);
      if (effect.target === 'movement.max') result.maxMovement = applyNumericEffect(result.maxMovement, effect);
      if (effect.target === 'initiative.max') result.maxInitiative = applyNumericEffect(result.maxInitiative, effect);
      if (effect.target === 'resource.max') {
        result.resource.maximum = applyNumericEffect(result.resource.maximum, effect);
      }
    });
  });
  return result;
};
;// ./src/features/roguelite/talents.js

const ROGUELITE_TALENT_SLOT_COUNT = 3;
const slugifyTalentId = function (value) {
  let index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const slug = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || "talento-".concat(index + 1);
};
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const resolveEditableText = function (value, primaryKey, legacyKey) {
  let fallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
  if (hasOwn(value, primaryKey)) {
    var _value$primaryKey;
    return String((_value$primaryKey = value[primaryKey]) !== null && _value$primaryKey !== void 0 ? _value$primaryKey : '');
  }
  if (hasOwn(value, legacyKey)) {
    var _value$legacyKey;
    return String((_value$legacyKey = value[legacyKey]) !== null && _value$legacyKey !== void 0 ? _value$legacyKey : '');
  }
  return fallback;
};
const normalizeTalent = function (talent, index) {
  let legacySource = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  const rawTalent = talent && typeof talent === 'object' ? talent : {};
  const name = resolveEditableText(rawTalent, 'name', 'nombre', "Talento ".concat(index + 1));
  return _objectSpread2(_objectSpread2({}, rawTalent), {}, {
    id: String(rawTalent.id || slugifyTalentId(name, index)).trim(),
    name,
    description: resolveEditableText(rawTalent, 'description', 'desc'),
    image: rawTalent.image || rawTalent.icon || '',
    imageSource: rawTalent.imageSource || '',
    available: legacySource ? Boolean(rawTalent.isActive) : rawTalent.available !== false
  });
};
const resolveRogueliteTalentCatalog = function () {
  var _classDefinition$rogu, _classDefinition$acti;
  let classDefinition = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const dedicatedCatalog = Array.isArray(classDefinition.talentCatalog) ? classDefinition.talentCatalog : (_classDefinition$rogu = classDefinition.roguelite) === null || _classDefinition$rogu === void 0 ? void 0 : _classDefinition$rogu.talentCatalog;
  const usesDedicatedCatalog = Array.isArray(dedicatedCatalog);
  const source = usesDedicatedCatalog ? dedicatedCatalog : ((_classDefinition$acti = classDefinition.actionData) === null || _classDefinition$acti === void 0 ? void 0 : _classDefinition$acti.reaction) || [];
  const usedIds = new Set();
  return (Array.isArray(source) ? source : []).map((talent, index) => {
    const normalized = normalizeTalent(talent, index, !usesDedicatedCatalog);
    let uniqueId = normalized.id;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = "".concat(normalized.id, "-").concat(suffix);
      suffix += 1;
    }
    usedIds.add(uniqueId);
    return _objectSpread2(_objectSpread2({}, normalized), {}, {
      id: uniqueId
    });
  });
};
const resolveEquippedTalentIds = function () {
  var _storedConfiguration$;
  let storedConfiguration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let talentCatalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const catalogById = new Map(talentCatalog.map(talent => [talent.id, talent]));
  const catalogByName = new Map(talentCatalog.map(talent => [talent.name.trim().toLowerCase(), talent.id]));
  const storedSlots = Array.isArray(storedConfiguration.equippedTalentIds) ? storedConfiguration.equippedTalentIds : (_storedConfiguration$ = storedConfiguration.talents) === null || _storedConfiguration$ === void 0 ? void 0 : _storedConfiguration$.slots;
  return Array.from({
    length: ROGUELITE_TALENT_SLOT_COUNT
  }, (_, index) => {
    const storedTalent = Array.isArray(storedSlots) ? storedSlots[index] : null;
    const candidateId = typeof storedTalent === 'string' ? storedTalent : (storedTalent === null || storedTalent === void 0 ? void 0 : storedTalent.id) || catalogByName.get(String((storedTalent === null || storedTalent === void 0 ? void 0 : storedTalent.name) || (storedTalent === null || storedTalent === void 0 ? void 0 : storedTalent.nombre) || '').trim().toLowerCase());
    if (!candidateId || !catalogById.has(candidateId)) return null;
    return candidateId;
  });
};
const ROGUELITE_SKILL_SLOT_COUNT = 3;
const resolveEquippedSkillIds = function () {
  var _storedConfiguration$2;
  let storedConfiguration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let abilityCatalog = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const storedSlots = Array.isArray(storedConfiguration.equippedSkillIds) ? storedConfiguration.equippedSkillIds : (_storedConfiguration$2 = storedConfiguration.skills) === null || _storedConfiguration$2 === void 0 ? void 0 : _storedConfiguration$2.slots;
  return Array.from({
    length: ROGUELITE_SKILL_SLOT_COUNT
  }, (_, index) => {
    const stored = Array.isArray(storedSlots) ? storedSlots[index] : null;
    const candidateId = typeof stored === 'string' ? stored : (stored === null || stored === void 0 ? void 0 : stored.templateId) || (stored === null || stored === void 0 ? void 0 : stored.id) || (stored === null || stored === void 0 ? void 0 : stored.name) || null;
    if (!candidateId) return null;
    return String(candidateId).trim();
  });
};
const createEmptyRogueliteTalent = function () {
  let existingCatalog = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  const baseId = "talento-".concat(Date.now());
  let id = baseId;
  let suffix = 2;
  const existingIds = new Set(existingCatalog.map(talent => talent.id));
  while (existingIds.has(id)) {
    id = "".concat(baseId, "-").concat(suffix);
    suffix += 1;
  }
  return {
    id,
    name: 'Nuevo talento',
    description: 'Describe el efecto de este talento.',
    image: '',
    imageSource: '',
    available: true
  };
};
;// ./src/features/roguelite/classDefinition.js




const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeDice = value => {
  if (!Array.isArray(value)) return [];
  return value.map(die => String(die || '').trim().toLowerCase()).filter(die => /^d\d+$/.test(die));
};
const normalizeRogueliteClass = function () {
  var _rules$maxLife, _rules$lifeInitial, _rules$defenseClass, _rules$maxDefenseClas, _rules$movement, _rules$maxMovement, _rules$initiativeBase, _rules$maxInitiative, _resource$maximum, _ref, _ref2, _resource$initial, _classItem$rogueliteP;
  let classItem = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const rules = classItem.roguelite || classItem.ruleset || {};
  const resource = _objectSpread2(_objectSpread2({}, classItem.resource || {}), rules.resource || {});
  const maxLife = Math.max(0, toNumber((_rules$maxLife = rules.maxLife) !== null && _rules$maxLife !== void 0 ? _rules$maxLife : classItem.maxLife, 0));
  const lifeInitial = Math.min(maxLife, Math.max(0, toNumber((_rules$lifeInitial = rules.lifeInitial) !== null && _rules$lifeInitial !== void 0 ? _rules$lifeInitial : classItem.lifeInitial, maxLife)));
  const rawDefenseClass = Math.max(0, toNumber((_rules$defenseClass = rules.defenseClass) !== null && _rules$defenseClass !== void 0 ? _rules$defenseClass : classItem.defenseClass, 0));
  const maxDefenseClass = Math.max(rawDefenseClass, toNumber((_rules$maxDefenseClas = rules.maxDefenseClass) !== null && _rules$maxDefenseClas !== void 0 ? _rules$maxDefenseClas : classItem.maxDefenseClass, rawDefenseClass));
  const rawMovement = Math.max(0, toNumber((_rules$movement = rules.movement) !== null && _rules$movement !== void 0 ? _rules$movement : classItem.movement, 0));
  const maxMovement = Math.max(rawMovement, toNumber((_rules$maxMovement = rules.maxMovement) !== null && _rules$maxMovement !== void 0 ? _rules$maxMovement : classItem.maxMovement, rawMovement));
  const rawInitiative = Math.max(0, toNumber((_rules$initiativeBase = rules.initiativeBase) !== null && _rules$initiativeBase !== void 0 ? _rules$initiativeBase : classItem.initiativeBase, 0));
  const maxInitiative = Math.max(rawInitiative, toNumber((_rules$maxInitiative = rules.maxInitiative) !== null && _rules$maxInitiative !== void 0 ? _rules$maxInitiative : classItem.maxInitiative, rawInitiative));
  const resourceMaximum = Math.max(0, toNumber((_resource$maximum = resource.maximum) !== null && _resource$maximum !== void 0 ? _resource$maximum : resource.max, 0));
  const resourceInitial = Math.min(resourceMaximum, Math.max(0, toNumber((_ref = (_ref2 = (_resource$initial = resource.initial) !== null && _resource$initial !== void 0 ? _resource$initial : resource.starting) !== null && _ref2 !== void 0 ? _ref2 : resource.start) !== null && _ref !== void 0 ? _ref : resource.current, 0)));
  return _objectSpread2(_objectSpread2({}, classItem), {}, {
    id: String(classItem.id || '').trim(),
    name: String(classItem.name || 'Clase sin nombre').trim(),
    subtitle: String(classItem.subtitle || classItem.role || 'Clase de aventura').trim(),
    description: String(classItem.description || 'Esta clase todavía no tiene descripción.').trim(),
    image: classItem.image || classItem.portraitSource || '',
    level: Math.max(1, toNumber(classItem.level, 1)),
    actionDice: normalizeDice(rules.actionDice || classItem.actionDice),
    lifeInitial,
    maxLife,
    defenseClass: rawDefenseClass,
    maxDefenseClass,
    movement: rawMovement,
    maxMovement,
    initiativeBase: rawInitiative,
    maxInitiative,
    classLevels: resolveRogueliteClassLevels(classItem),
    rogueliteProgressionConfigured: Boolean((_classItem$rogueliteP = classItem.rogueliteProgressionConfigured) !== null && _classItem$rogueliteP !== void 0 ? _classItem$rogueliteP : rules.progressionConfigured),
    resource: _objectSpread2(_objectSpread2({}, resource), {}, {
      name: String(resource.name || '').trim(),
      color: resource.color || '#c8aa6e',
      maximum: resourceMaximum,
      initial: resourceInitial
    }),
    talentCatalog: resolveRogueliteTalentCatalog(classItem),
    equipment: resolveRogueliteEquipmentPool(classItem)
  });
};
const mergeRogueliteClassCatalogs = function () {
  let legacyClasses = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  let rogueliteClasses = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const classById = new Map();
  [...legacyClasses, ...rogueliteClasses].forEach(classItem => {
    var _ref3, _ref4, _classItem$talentCata;
    const classId = String((classItem === null || classItem === void 0 ? void 0 : classItem.id) || '').trim();
    if (!classId) return;
    const previousClass = classById.get(classId) || {};
    const previousRules = previousClass.roguelite || {};
    const nextRules = classItem.roguelite || {};
    const mergedTalentCatalog = (_ref3 = (_ref4 = (_classItem$talentCata = classItem.talentCatalog) !== null && _classItem$talentCata !== void 0 ? _classItem$talentCata : nextRules.talentCatalog) !== null && _ref4 !== void 0 ? _ref4 : previousClass.talentCatalog) !== null && _ref3 !== void 0 ? _ref3 : previousRules.talentCatalog;
    classById.set(classId, _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, previousClass), classItem), {}, {
      id: classId
    }, Array.isArray(mergedTalentCatalog) ? {
      talentCatalog: mergedTalentCatalog
    } : {}), {}, {
      roguelite: _objectSpread2(_objectSpread2(_objectSpread2({}, previousRules), nextRules), {}, {
        resource: _objectSpread2(_objectSpread2({}, previousRules.resource || {}), nextRules.resource || {})
      }, Array.isArray(mergedTalentCatalog) ? {
        talentCatalog: mergedTalentCatalog
      } : {})
    }));
  });
  return Array.from(classById.values()).map(normalizeRogueliteClass).sort((left, right) => left.name.localeCompare(right.name, 'es', {
    sensitivity: 'base'
  }));
};
// EXTERNAL MODULE: ./node_modules/react-dom/server.browser.js
var server_browser = __webpack_require__(848);
;// ./src/components/ActionDieSvg.jsx

const PALETTES = {
  teal: {
    accent: '#7bc7bb',
    accentBright: '#d6f0e8',
    accentDark: '#305e55',
    ember: '#5ca99a',
    numeral: '#e5f6ef'
  },
  arcane: {
    accent: '#a798d6',
    accentBright: '#e0d9ff',
    accentDark: '#51416f',
    ember: '#9683ce',
    numeral: '#f0eaff'
  },
  amber: {
    accent: '#e6a054',
    accentBright: '#ffe0af',
    accentDark: '#8a451d',
    ember: '#e78a32',
    numeral: '#fff0d7'
  },
  gold: {
    accent: '#d7b867',
    accentBright: '#f4dfa4',
    accentDark: '#6f4f1d',
    ember: '#d98b2b',
    numeral: '#fff2c6'
  },
  blue: {
    accent: '#67a9d8',
    accentBright: '#c4e7ff',
    accentDark: '#244d72',
    ember: '#4da9e8',
    numeral: '#e6f6ff'
  },
  red: {
    accent: '#d66a5f',
    accentBright: '#ffc1b7',
    accentDark: '#702d2a',
    ember: '#d34b3f',
    numeral: '#ffe4dd'
  },
  slate: {
    accent: '#64748b',
    accentBright: '#cbd5e1',
    accentDark: '#273244',
    ember: '#64748b',
    numeral: '#d8dee9'
  }
};
const normalizeFaces = faces => {
  const parsed = Number.parseInt(String(faces || '').replace(/\D/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 6;
};
const DieGeometry = _ref => {
  let {
    faces,
    ids,
    connectedFaces
  } = _ref;
  const shared = {
    fill: "url(#".concat(ids.body, ")"),
    stroke: "url(#".concat(ids.metal, ")"),
    strokeWidth: 4,
    strokeLinejoin: 'round'
  };
  const facet = {
    fill: "url(#".concat(ids.facet, ")"),
    stroke: "url(#".concat(ids.metal, ")"),
    strokeWidth: 1.35,
    strokeLinejoin: 'round'
  };
  const facetLine = {
    fill: 'none',
    stroke: "url(#".concat(ids.metal, ")"),
    strokeWidth: 1.15,
    strokeLinejoin: 'round',
    opacity: 0.34
  };
  if (faces === 20 && connectedFaces) {
    return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-outline": "connected",
      points: "60,7 110,32 110,88 60,113 10,88 10,32"
    }, shared)), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "upper-left",
      points: "60,7 10,32 28,39"
    }, facet, {
      fillOpacity: "0.72"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "upper",
      points: "60,7 28,39 92,39"
    }, facet, {
      fillOpacity: "0.9"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "upper-right",
      points: "60,7 92,39 110,32"
    }, facet, {
      fillOpacity: "0.78"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "middle-left",
      points: "10,32 10,88 28,39"
    }, facet, {
      fillOpacity: "0.62"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "middle-right",
      points: "110,32 92,39 110,88"
    }, facet, {
      fillOpacity: "0.7"
    })), /*#__PURE__*/react.createElement("polygon", {
      "data-d20-facet": "center",
      points: "28,39 92,39 60,94",
      fill: "url(#".concat(ids.body, ")"),
      stroke: "url(#".concat(ids.metal, ")"),
      strokeWidth: "2",
      strokeLinejoin: "round"
    }), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "lower-left",
      points: "28,39 10,88 60,94"
    }, facet, {
      fillOpacity: "0.66"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "lower-right",
      points: "92,39 60,94 110,88"
    }, facet, {
      fillOpacity: "0.76"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "base-left",
      points: "10,88 60,113 60,94"
    }, facet, {
      fillOpacity: "0.58"
    })), /*#__PURE__*/react.createElement("polygon", Object.assign({
      "data-d20-facet": "base-right",
      points: "60,94 60,113 110,88"
    }, facet, {
      fillOpacity: "0.7"
    })));
  }
  switch (faces) {
    case 4:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,9 108,101 12,101"
      }, shared)), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,9 60,84 108,101"
      }, facet, {
        opacity: "0.58"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "12,101 60,84 108,101"
      }, facet, {
        opacity: "0.34"
      })), /*#__PURE__*/react.createElement("path", Object.assign({
        d: "M60 9L60 84M12 101L60 84L108 101"
      }, facetLine)));
    case 6:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("path", Object.assign({
        d: "M16 31L36 12H102V76L81 99H16Z"
      }, shared)), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "16,31 36,12 102,12 81,31"
      }, facet, {
        opacity: "0.72"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "81,31 102,12 102,76 81,99"
      }, facet, {
        opacity: "0.52"
      })), /*#__PURE__*/react.createElement("polygon", {
        points: "16,31 81,31 81,99 16,99",
        fill: "url(#".concat(ids.body, ")"),
        stroke: "url(#".concat(ids.metal, ")"),
        strokeWidth: "2.2",
        strokeLinejoin: "round"
      }), /*#__PURE__*/react.createElement("path", Object.assign({
        d: "M16 31H81V99M81 31L102 12"
      }, facetLine)));
    case 8:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,7 110,58 60,111 10,58"
      }, shared)), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,7 60,58 10,58"
      }, facet, {
        opacity: "0.68"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,7 110,58 60,58"
      }, facet, {
        opacity: "0.34"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "10,58 60,58 60,111"
      }, facet, {
        opacity: "0.25"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "60,58 110,58 60,111"
      }, facet, {
        opacity: "0.5"
      })), /*#__PURE__*/react.createElement("path", Object.assign({
        d: "M10 58H110M60 7V111"
      }, facetLine)));
    case 10:
    case 100:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "53,8 6,58 29,53"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.72"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "67,8 114,58 91,53"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.86"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "29,57 8,62 58,114 58,71 32,59"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.64"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "88,59 62,71 62,114 112,62 91,57"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.78"
      })), /*#__PURE__*/react.createElement("polygon", {
        points: "60,6 32,54 60,67 88,54",
        fill: "url(#".concat(ids.body, ")"),
        stroke: "url(#".concat(ids.metal, ")"),
        strokeWidth: "3.2",
        strokeLinejoin: "round"
      }));
    case 12:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "58,33 58,11 31,20 15,43 35,49"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.72"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "106,43 89,20 62,11 62,33 85,49"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.86"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "34,54 13,47 13,75 30,98 42,80"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.64"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "86,54 78,80 90,98 107,75 107,47"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.78"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        points: "46,83 33,100 60,109 87,100 74,83"
      }, facet, {
        strokeWidth: "2.6",
        fillOpacity: "0.7"
      })), /*#__PURE__*/react.createElement("polygon", {
        points: "47,78 74,78 82,53 60,37 38,53",
        fill: "url(#".concat(ids.body, ")"),
        stroke: "url(#".concat(ids.metal, ")"),
        strokeWidth: "3.2",
        strokeLinejoin: "round"
      }));
    case 20:
    default:
      return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "upper-left",
        points: "8,27 44,4 27,40"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.72"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "upper",
        points: "60,3 33,42 87,42"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.9"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "upper-right",
        points: "76,4 112,27 93,40"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.78"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "middle-left",
        points: "5,36 24,47 5,75"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.62"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "middle-right",
        points: "115,36 96,47 115,75"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.7"
      })), /*#__PURE__*/react.createElement("polygon", {
        "data-d20-facet": "center",
        points: "35,49 85,49 60,90",
        fill: "url(#".concat(ids.body, ")"),
        stroke: "url(#".concat(ids.metal, ")"),
        strokeWidth: "2.4",
        strokeLinejoin: "round"
      }), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "lower-left",
        points: "29,52 54,95 5,90"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.66"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "lower-right",
        points: "91,52 66,95 115,90"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.76"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "base-left",
        points: "8,99 56,104 56,116"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.58"
      })), /*#__PURE__*/react.createElement("polygon", Object.assign({
        "data-d20-facet": "base-right",
        points: "64,104 112,99 64,116"
      }, facet, {
        strokeWidth: "2",
        fillOpacity: "0.7"
      })));
  }
};
const ActionDieSvg = _ref2 => {
  let {
    faces,
    value,
    className = '',
    title,
    accent = 'gold',
    status = 'available',
    selected = false,
    connectedFaces = false
  } = _ref2;
  const reactId = (0,react.useId)().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    body: "action-die-body-".concat(reactId),
    facet: "action-die-facet-".concat(reactId),
    metal: "action-die-metal-".concat(reactId),
    glow: "action-die-glow-".concat(reactId),
    aura: "action-die-aura-".concat(reactId)
  };
  const normalizedFaces = normalizeFaces(faces);
  const palette = PALETTES[status === 'spent' ? 'slate' : accent] || PALETTES.gold;
  const displayValue = value !== null && value !== void 0 ? value : normalizedFaces;
  const textY = normalizedFaces === 20 && connectedFaces ? 58 : normalizedFaces === 4 ? 70 : normalizedFaces === 6 ? 69 : normalizedFaces === 10 ? 43 : normalizedFaces === 12 ? 60 : 64;
  const textX = normalizedFaces === 6 ? 48 : normalizedFaces === 12 ? 59 : 60;
  const fontSize = String(displayValue).length > 1 ? 24 : normalizedFaces === 4 ? 33 : 35;
  const isSpent = status === 'spent';
  const isCommitted = status === 'committed';
  const ariaLabel = title || "D".concat(normalizedFaces, " con valor ").concat(displayValue);
  return /*#__PURE__*/react.createElement("svg", {
    viewBox: "0 0 120 120",
    className: "action-die-svg ".concat(className),
    role: "img",
    "aria-label": ariaLabel,
    "data-action-die": normalizedFaces,
    "data-die-accent": isSpent ? 'slate' : accent
  }, /*#__PURE__*/react.createElement("title", null, ariaLabel), /*#__PURE__*/react.createElement("defs", null, /*#__PURE__*/react.createElement("linearGradient", {
    id: ids.body,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/react.createElement("stop", {
    offset: "0",
    stopColor: isSpent ? '#1a202b' : '#273247'
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "0.42",
    stopColor: isSpent ? '#0f141d' : '#101723'
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "1",
    stopColor: "#05080e"
  })), /*#__PURE__*/react.createElement("radialGradient", {
    id: ids.facet,
    cx: "36%",
    cy: "24%",
    r: "88%"
  }, /*#__PURE__*/react.createElement("stop", {
    offset: "0",
    stopColor: isSpent ? '#334155' : palette.accent,
    stopOpacity: isSpent ? 0.18 : 0.27
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "0.48",
    stopColor: "#111827",
    stopOpacity: "0.44"
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "1",
    stopColor: "#020409",
    stopOpacity: "0.82"
  })), /*#__PURE__*/react.createElement("linearGradient", {
    id: ids.metal,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/react.createElement("stop", {
    offset: "0",
    stopColor: palette.accentBright
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "0.26",
    stopColor: palette.accent
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "0.58",
    stopColor: palette.accentDark
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "0.82",
    stopColor: palette.accentBright
  }), /*#__PURE__*/react.createElement("stop", {
    offset: "1",
    stopColor: palette.accentDark
  })), /*#__PURE__*/react.createElement("filter", {
    id: ids.glow,
    x: "-35%",
    y: "-35%",
    width: "170%",
    height: "170%"
  }, /*#__PURE__*/react.createElement("feGaussianBlur", {
    stdDeviation: selected ? 3.5 : 2.1,
    result: "blur"
  }), /*#__PURE__*/react.createElement("feMerge", null, /*#__PURE__*/react.createElement("feMergeNode", {
    in: "blur"
  }), /*#__PURE__*/react.createElement("feMergeNode", {
    in: "SourceGraphic"
  }))), /*#__PURE__*/react.createElement("filter", {
    id: ids.aura,
    x: "-60%",
    y: "-100%",
    width: "220%",
    height: "300%"
  }, /*#__PURE__*/react.createElement("feGaussianBlur", {
    stdDeviation: selected ? 6 : 4
  }))), /*#__PURE__*/react.createElement("ellipse", {
    cx: "60",
    cy: "106",
    rx: selected ? 34 : 28,
    ry: selected ? 7 : 5,
    fill: palette.ember,
    opacity: isSpent ? 0.06 : selected ? 0.34 : 0.17,
    filter: "url(#".concat(ids.aura, ")")
  }), /*#__PURE__*/react.createElement("g", {
    opacity: isSpent ? 0.46 : 1,
    filter: selected || isCommitted ? "url(#".concat(ids.glow, ")") : undefined
  }, /*#__PURE__*/react.createElement(DieGeometry, {
    faces: normalizedFaces,
    ids: ids,
    connectedFaces: connectedFaces
  }), /*#__PURE__*/react.createElement("text", {
    x: textX,
    y: textY,
    textAnchor: "middle",
    dominantBaseline: "middle",
    fill: palette.numeral,
    stroke: palette.accentDark,
    strokeWidth: "1.25",
    paintOrder: "stroke",
    fontFamily: "Cinzel, Georgia, serif",
    fontSize: fontSize,
    fontWeight: "700"
  }, displayValue)));
};
/* harmony default export */ const components_ActionDieSvg = (ActionDieSvg);
;// ./integrations/foundry/engine-entry.js









let svgId = 0;
const renderActionDie = props => (0,server_browser/* renderToStaticMarkup */.qV)(/*#__PURE__*/react.createElement(components_ActionDieSvg, props), {
  identifierPrefix: "noma-".concat(++svgId, "-")
});
export { ACTION_DIE_STATUSES, CANVAS_COMBAT_VERSION, CANVAS_MUTABLE_PROTECTIONS, DOCUMENTED_BARBARIAN_LEVELS, EQUIPMENT_CATEGORIES, ROGUELITE_LEVEL_EFFECT_TARGETS, ROGUELITE_WEAPON_SET_COUNT, activateWeaponSet, applyRogueliteLevelEffects, buildInitiativeBlocks, calculateCanvasAttackPressure, cancelQueuedCanvasAttack, consumeItemUseResource, createCanvasCombatState, createEquipmentTemplateId, defaultEnemyActions, describeRogueliteLevelEffect, equipItemInSlot, equipItemInWeaponSet, equipmentItemsShareInstance, evaluateCanvasAttackRange, evaluateCanvasThrownRange, finishCanvasCombat, getAvailableMovement, getCanvasArmorProtection, getCanvasAttackThreatDice, getCanvasCombatItems, getCanvasCounterattackWeapons, getCanvasDefenseThreatDice, getCanvasDefensiveEquipment, getCanvasEquippedArmor, getCanvasEquippedWeapons, getCanvasWeaponActionCost, getCanvasWeaponAvailability, getCanvasWeaponIdentity, getCanvasWeaponRange, getCanvasWeaponTraits, getCriticalDieSides, getDefaultCanvasEnemyDefenseSelection, getEnemyActiveDefenseEligibility, getMovementAllowance, getMovementBase, getMovementStatMax, getPreferredCanvasCounterattackWeapon, getRogueliteEffectDefinition, getRogueliteEffectLabel, getRogueliteLevelEffects, getUsableAttackDice, getUsableDefenseDice, hasCanvasMutableArmor, hasCanvasStatus, hasCanvasWeaponTrait, isCanvasCuttingAttack, isCanvasProne, isCanvasShield, markParticipantActed, materializeEquipmentInstances, mergeRogueliteClassCatalogs, normalizeActionDiceProfile, normalizeCanvasThreatSelection, normalizeDieSides, normalizeEquipmentPoolItem, normalizeEquippedHandSlots, normalizeEquippedWeaponSets, normalizeRogueliteClass, normalizeRogueliteEquipmentPool, normalizeRogueliteLevelEffect, normalizeRogueliteProgressionLevel, parseWeaponDiceProfile, pruneCombatState, queueCanvasAttack, rechargeEnemyMovementWithAttack, reconcileEquippedItemsWithInventory, recordParticipantMovement, renderActionDie, resolveBeltSlotCount, resolveCanvasAttackDamage, resolveCanvasEnemyDefenseSelection, equipmentPool_resolveEquipmentHandsRequired as resolveEquipmentHandsRequired, resolveEquipmentInstanceId, resolveEquippedHandOccupancy, resolveEquippedItemUsages, resolveEquippedWeaponSet, resolveQueuedCanvasAttack, resolveRogueliteClassLevels, resolveRogueliteEquipmentPool, rollCanvasEnemyDefense, rollCanvasThreatDice, rollCanvasThreatDie, rollCriticalWeaponDice, rollDiceProfile, rollDie, rollParticipantActionDice, rollWeaponDice, setActionDieStatus, setEnemyActionStatus, setParticipantMovementModifier, setParticipantMovementResource, sortCombatParticipants, spendActionDieForSprint, startNextRound, submitActionDice, toggleCanvasEnemyDefenseEquipment, undoLastActivation, undoParticipantActivation, undoParticipantMovement, validateDiceResults, validateWeaponResults };
