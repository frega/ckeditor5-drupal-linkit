/**
 * @module linkit/linkediting
 */

import LinkEditing from '@ckeditor/ckeditor5-link/src/linkediting';
import LinkitCommand from './linkitcommand';
import UnlinkLinkitCommand from './unlinklinkitcommand';
import LinkCommand from '@ckeditor/ckeditor5-link/src/linkcommand';
import UnlinkCommand from '@ckeditor/ckeditor5-link/src/unlinkcommand';
import { ensureSafeUrl, createLinkElement } from '@ckeditor/ckeditor5-link/src/utils';
import { createLinkAttributeElement } from './utils';
import bindTwoStepCaretToAttribute from '@ckeditor/ckeditor5-engine/src/utils/bindtwostepcarettoattribute';
import '@ckeditor/ckeditor5-link/theme/link.css';

/**
 * The link engine feature.
 *
 * It introduces the `linkHref="url"` attribute in the model which renders to the view as a `<a href="url">` element.
 *
 * @extends module:core/plugin~Plugin
 */
export default class LinkitEditing extends LinkEditing {
	/**
   * @inheritDoc
   */
	init() {
		const editor = this.editor;
		this._linkSelector = editor.config.get( 'drupalLinkSelector' ) ? editor.config.get( 'drupalLinkSelector' ).callback : null;

		// Allow link attribute on all inline nodes.
		editor.model.schema.extend( '$text', { allowAttributes: [ 'linkHref', 'linkitAttrs' ] } );

		editor.conversion.for( 'dataDowncast' ).attributeToElement( { model: 'linkHref', view: ( href, writer ) => {
			return createLinkElement( href, writer );
		} } );

		editor.conversion.for( 'editingDowncast' ).attributeToElement( { model: 'linkHref', view: ( href, writer ) => {
			return createLinkElement( ensureSafeUrl( href ), writer );
		} } );

		editor.conversion.for( 'dataDowncast' ).attributeToElement( { model: 'linkitAttrs', view: ( attributes, writer ) => {
			return createLinkAttributeElement( attributes, writer );
		} } );

		editor.conversion.for( 'editingDowncast' ).attributeToElement( { model: 'linkitAttrs', view: ( attributes, writer ) => {
			return createLinkAttributeElement( attributes, writer );
		} } );

		editor.conversion.for( 'upcast' ).elementToAttribute( {
			view: {
				name: 'a',
				attributes: {
					href: true
				}
			},
			model: {
				key: 'linkHref',

				value: viewElement => viewElement.getAttribute( 'href' )
			}
		} );

		editor.conversion.for( 'upcast' ).elementToAttribute( {
			view: {
				name: 'a'
			},
			model: {
				key: 'linkitAttrs',
				value: viewElement => {
					const attrs = {};
					for ( const [ key, value ] of viewElement.getAttributes() ) {
						attrs[ key ] = value;
					}
					return attrs;
				}
			}
		} );

		// Create linking commands.
		if ( this._linkSelector ) {
			editor.commands.add( 'link', new LinkitCommand( editor ) );
			editor.commands.add( 'unlink', new UnlinkLinkitCommand( editor ) );
		} else {
			editor.commands.add( 'link', new LinkCommand( editor ) );
			editor.commands.add( 'unlink', new UnlinkCommand( editor ) );
		}

		// Enable two-step caret movement for `linkHref` attribute.
		bindTwoStepCaretToAttribute( editor.editing.view, editor.model, this, 'linkHref' );

		// Setup highlight over selected link.
		this._setupLinkHighlight();
	}
}
