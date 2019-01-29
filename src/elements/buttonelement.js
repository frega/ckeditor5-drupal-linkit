/**
 * @module templates/elements/textelement
 */
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, toWidgetEditable } from '@ckeditor/ckeditor5-widget/src/utils';

import TemplateEditing from '@amazee/ckeditor5-template/src/templateediting';
import { downcastTemplateElement, getModelAttributes } from '@amazee/ckeditor5-template/src/utils/conversion';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';
import { attachPlaceholder } from '@ckeditor/ckeditor5-engine/src/view/placeholder';

export default class ButtonElement extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ TemplateEditing ];
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const buttonElements = this.editor.templates.getElementsByType( 'button' );

		this.editor.model.schema.extend( '$text', {
			allowIn: buttonElements.map( el => el.name ),
		} );

		// Text element editing downcast
		this.editor.conversion.for( 'editingDowncast' ).add( downcastTemplateElement( this.editor, {
			types: [ 'button' ],
			view: ( templateElement, modelElement, viewWriter ) => {
				const el = viewWriter.createEditableElement(
					templateElement.tagName,
					getModelAttributes( templateElement, modelElement )
				);

				if ( templateElement.text ) {
					attachPlaceholder( this.editor.editing.view, el, templateElement.text );
				}
				return toWidgetEditable( templateElement.parent ? el : toWidget( el, viewWriter ), viewWriter );
			}
		} ), { priority: 'low ' } );

		for ( const element of buttonElements ) {
			if ( element.configuration.plain === 'true' ) {
				this.editor.model.schema.addAttributeCheck( ( context, attributeName ) => {
					if ( context.endsWith( `${ element.name } $text` ) && ![ 'linkHref', 'linkitAttrs' ].includes( attributeName ) ) {
						return false;
					}
				} );
			}
		}

		// Make sure everything inside a button element is a link.
		this.editor.model.document.registerPostFixer( writer => {
			for ( const entry of this.editor.model.document.differ.getChanges() ) {
				if ( !( entry.name === '$text' ) ) {
					continue;
				}

				const parent = entry.position.getAncestors().pop();
				if ( !parent ) {
					continue;
				}

				const elementInfo = this.editor.templates.getElementInfo( parent.name );

				if ( !elementInfo || !( elementInfo.type === 'button' ) ) {
					continue;
				}

				if ( parent.childCount === 0 ) {
					continue;
				}

				const href = parent.getChild( 0 ).getAttribute( 'linkHref' ) || '#';
				const attrs = parent.getChild( 0 ).getAttribute( 'linkitAttrs' ) || '';

				const start = writer.createPositionAt( parent, 0 );
				const end = writer.createPositionAt( parent, 'end' );

				writer.setAttributes( { linkHref: href, linkitAttrs: attrs }, new Range( start, end ) );
			}
		} );
	}
}
