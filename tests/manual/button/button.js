/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, window, document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import Linkit from '../../../src/linkit';
import ButtonElement from '../../../src/elements/buttonelement';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import TemplateUI from '@amazee/ckeditor5-template/src/ui/templateui';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Linkit, Typing, Paragraph, Undo, Enter, ButtonElement, TemplateUI ],
		toolbar: [ 'template' ],
		templates: {
			button: {
				label: 'Button',
				template: '<div class="button" ck-type="button">Test</div>',
			},
		},
		drupalLinkSelector: { callback: ( existingValues, callback ) => {
			callback( { href: 'http://www.drupal.org' } );
		} },
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
