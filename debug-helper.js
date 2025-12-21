/**
 * Stitch DOM Debug Helper
 *
 * Paste this script into the browser console on a Stitch project page
 * to analyze the page structure and help identify correct selectors
 */

(function() {
  'use strict';

  console.clear();
  console.log('%c=== Stitch Export DOM Debug Helper ===', 'font-size: 16px; font-weight: bold; color: #4285F4');
  console.log('Analyzing page structure...\n');

  // 1. Basic Page Info
  console.log('%c1. Page Information', 'font-size: 14px; font-weight: bold; color: #333');
  console.log('URL:', window.location.href);
  console.log('Title:', document.title);
  console.log('Ready State:', document.readyState);
  console.log('');

  // 2. Look for Angular/React components
  console.log('%c2. Framework Detection', 'font-size: 14px; font-weight: bold; color: #333');

  const angularElements = document.querySelectorAll('[ng-version], [_nghost], [_ngcontent]');
  console.log('Angular elements found:', angularElements.length);

  const reactElements = document.querySelectorAll('[data-reactroot], [data-reactid]');
  console.log('React elements found:', reactElements.length);

  const appComponents = document.querySelectorAll('[class*="appcompanion"]');
  console.log('AppCompanion components:', appComponents.length);
  if (appComponents.length > 0) {
    console.log('Sample components:', Array.from(appComponents).slice(0, 3).map(el => el.tagName.toLowerCase()));
  }
  console.log('');

  // 3. Search for message-like elements
  console.log('%c3. Message Container Analysis', 'font-size: 14px; font-weight: bold; color: #333');

  const selectors = [
    { name: 'Article elements (semantic)', selector: 'article, [role="article"]' },
    { name: 'Message class patterns', selector: '[class*="message"], [class*="Message"]' },
    { name: 'Chat patterns', selector: '[class*="chat"], [class*="Chat"]' },
    { name: 'Conversation patterns', selector: '[class*="conversation"], [class*="Conversation"]' },
    { name: 'Prompt/Response patterns', selector: '[class*="prompt"], [class*="response"]' },
    { name: 'User/Assistant patterns', selector: '[class*="user"], [class*="assistant"]' },
    { name: 'Markdown containers', selector: '.markdown, [class*="markdown"]' },
    { name: 'Data attributes', selector: '[data-message], [data-role], [data-message-id]' },
    { name: 'Paragraphs in main', selector: 'main p' },
  ];

  const results = [];

  selectors.forEach(({ name, selector }) => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results.push({
          name,
          selector,
          count: elements.length,
          elements: Array.from(elements).slice(0, 3)
        });

        console.log(`%c✓ ${name}`, 'color: #2e7d32; font-weight: bold');
        console.log(`  Selector: ${selector}`);
        console.log(`  Found: ${elements.length} elements`);

        if (elements[0]) {
          console.log(`  First element tag: <${elements[0].tagName.toLowerCase()}>`);
          console.log(`  Classes:`, elements[0].className || '(none)');
          console.log(`  ID:`, elements[0].id || '(none)');
          console.log(`  Text preview:`, elements[0].textContent.substring(0, 100).trim() + '...');
        }
        console.log('');
      }
    } catch (e) {
      console.warn(`Error testing selector "${selector}":`, e.message);
    }
  });

  // 4. Analyze the most promising results
  console.log('%c4. Recommended Selectors', 'font-size: 14px; font-weight: bold; color: #333');

  if (results.length > 0) {
    results.sort((a, b) => {
      // Prefer specific message-related selectors
      if (a.name.includes('message') || a.name.includes('Message')) return -1;
      if (b.name.includes('message') || b.name.includes('Message')) return 1;
      return b.count - a.count;
    });

    console.log('Best candidates (in order):');
    results.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: "${result.selector}" (${result.count} elements)`);
    });
  } else {
    console.warn('No obvious message containers found. Trying alternative analysis...');
  }
  console.log('');

  // 5. Content analysis
  console.log('%c5. Content Analysis', 'font-size: 14px; font-weight: bold; color: #333');

  const bodyText = document.body.innerText;
  console.log('Total page text length:', bodyText.length, 'characters');

  // Look for conversation-like text
  const lines = bodyText.split('\n').filter(line => line.trim().length > 20);
  console.log('Text lines > 20 chars:', lines.length);

  if (lines.length > 0) {
    console.log('Sample lines:');
    lines.slice(0, 5).forEach((line, i) => {
      console.log(`  ${i + 1}. ${line.substring(0, 80)}...`);
    });
  }
  console.log('');

  // 6. Look for specific text patterns mentioned by user
  console.log('%c6. User-Mentioned Content Check', 'font-size: 14px; font-weight: bold; color: #333');

  const searchTexts = [
    'You are a senior mobile UI/UX designer',
    'What would you like to do next',
    'Welcome Screen'
  ];

  searchTexts.forEach(text => {
    if (bodyText.includes(text)) {
      console.log(`%c✓ Found: "${text.substring(0, 50)}..."`, 'color: #2e7d32');

      // Try to find the containing element
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes(text)) {
          const parent = node.parentElement;
          console.log(`  Container: <${parent.tagName.toLowerCase()}>`);
          console.log(`  Classes:`, parent.className || '(none)');
          console.log(`  Path:`, getElementPath(parent));
          break;
        }
      }
    } else {
      console.log(`✗ Not found: "${text.substring(0, 50)}..."`);
    }
  });
  console.log('');

  // 7. Interactive helper
  console.log('%c7. Interactive Testing', 'font-size: 14px; font-weight: bold; color: #333');
  console.log('Test a selector by running:');
  console.log('%c  testSelector("your-selector-here")', 'color: #1976D2; font-family: monospace');
  console.log('');
  console.log('Inspect an element by running:');
  console.log('%c  inspectElement(document.querySelector("your-selector"))', 'color: #1976D2; font-family: monospace');
  console.log('');

  // 8. Summary and recommendations
  console.log('%c8. Summary & Next Steps', 'font-size: 14px; font-weight: bold; color: #333');

  if (results.length > 0) {
    console.log('%cRECOMMENDATION:', 'color: #2e7d32; font-weight: bold');
    console.log('Update utils/extractor.js line ~78 with these selectors:');
    console.log('');
    console.log('%cconst messageSelectors = [', 'color: #666; font-family: monospace');
    results.slice(0, 3).forEach(result => {
      console.log(`%c  '${result.selector}',`, 'color: #666; font-family: monospace');
    });
    console.log('%c];', 'color: #666; font-family: monospace');
  } else {
    console.log('%cWARNING:', 'color: #f57c00; font-weight: bold');
    console.log('No obvious message containers found.');
    console.log('Please manually inspect a message element:');
    console.log('1. Right-click on a visible message');
    console.log('2. Select "Inspect"');
    console.log('3. Note the element structure and classes');
    console.log('4. Run: inspectElement($0) in console');
  }

  // 9. Check for iframes
  console.log('%c9. IFrame Analysis', 'font-size: 14px; font-weight: bold; color: #333');

  const iframes = document.querySelectorAll('iframe');
  console.log(`Found ${iframes.length} iframes`);

  if (iframes.length > 0) {
    iframes.forEach((iframe, i) => {
      console.log(`\n%cIFrame ${i + 1}:`, 'font-weight: bold');
      console.log('  src:', iframe.src || '(no src)');
      console.log('  id:', iframe.id || '(none)');
      console.log('  class:', iframe.className || '(none)');

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeMarkdown = iframeDoc.querySelectorAll('.markdown, div.markdown, [class*="markdown"]');
        console.log('  Markdown divs in iframe:', iframeMarkdown.length);

        if (iframeMarkdown.length > 0) {
          console.log(`  %c✅ FOUND ${iframeMarkdown.length} MESSAGES IN THIS IFRAME!`, 'color: #2e7d32; font-weight: bold');
          iframeMarkdown.forEach((div, j) => {
            console.log(`    Message ${j + 1}:`, div.textContent.substring(0, 50) + '...');
          });

          // Check if StitchExtractor is available in this iframe
          const hasExtractor = typeof iframe.contentWindow.StitchExtractor !== 'undefined';
          console.log('  StitchExtractor available in iframe:', hasExtractor);
        }
      } catch (e) {
        console.log(`  ⚠️ Cannot access iframe content:`, e.message);
        console.log('  (This is normal for cross-origin iframes)');
      }
    });
  }

  console.log('');
  console.log('%c=== Analysis Complete ===', 'font-size: 16px; font-weight: bold; color: #4285F4');

  // Helper functions
  window.testSelector = function(selector) {
    console.clear();
    console.log(`Testing selector: "${selector}"`);

    try {
      const elements = document.querySelectorAll(selector);
      console.log(`Found: ${elements.length} elements`);

      if (elements.length > 0) {
        console.log('\nFirst 3 elements:');
        Array.from(elements).slice(0, 3).forEach((el, i) => {
          console.log(`\n${i + 1}.`, el);
          console.log('   Tag:', el.tagName);
          console.log('   Classes:', el.className || '(none)');
          console.log('   Text:', el.textContent.substring(0, 100).trim() + '...');
        });

        return elements;
      } else {
        console.log('No elements found');
        return null;
      }
    } catch (e) {
      console.error('Selector error:', e.message);
      return null;
    }
  };

  window.inspectElement = function(element) {
    if (!element) {
      console.error('No element provided');
      return;
    }

    console.clear();
    console.log('%c=== Element Inspection ===', 'font-size: 14px; font-weight: bold');
    console.log('\nElement:', element);
    console.log('Tag:', element.tagName);
    console.log('Classes:', element.className || '(none)');
    console.log('ID:', element.id || '(none)');
    console.log('Path:', getElementPath(element));

    console.log('\nAttributes:');
    Array.from(element.attributes).forEach(attr => {
      console.log(`  ${attr.name}: "${attr.value}"`);
    });

    console.log('\nText content (first 200 chars):');
    console.log(element.textContent.substring(0, 200).trim() + '...');

    console.log('\nParent:', element.parentElement?.tagName);
    console.log('Children count:', element.children.length);

    if (element.children.length > 0) {
      console.log('Child elements:');
      Array.from(element.children).slice(0, 5).forEach(child => {
        console.log(`  <${child.tagName.toLowerCase()}${child.className ? ' class="' + child.className + '"' : ''}>`);
      });
    }

    return element;
  };

  function getElementPath(element) {
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
      } else if (element.className) {
        selector += '.' + element.className.split(' ').join('.');
      }
      path.unshift(selector);
      element = element.parentElement;
    }
    return path.join(' > ');
  }

  // Make results available globally
  window.debugResults = results;

})();
