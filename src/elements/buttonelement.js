/**
 * @module templates/elements/textelement
 */
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import TemplateEditing from '@amazee/ckeditor5-template/src/templateediting';
import { downcastTemplateElement, getModelAttributes } from '@amazee/ckeditor5-template/src/utils/conversion';
import { postfixTemplateElement } from '@amazee/ckeditor5-template/src/utils/integrity';
import DomEventObserver from '@ckeditor/ckeditor5-engine/src/view/observer/domeventobserver';

// TODO: Attach a generic observer to trigger dialogs?
class LinkSelectObserver extends DomEventObserver {
	constructor( view ) {
		super( view );
		this.domEventType = 'selectLink';
		this.useCapture = true;
	}

	onDomEvent( domEvent ) {
		this.fire( domEvent.type, domEvent );
	}
}

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
		this.editor.editing.view.addObserver( LinkSelectObserver );
		this._linkSelector = this.editor.config.get( 'drupalLinkSelector' ) ?
			this.editor.config.get( 'drupalLinkSelector' ).callback :
			null;

		if ( !this._linkSelector ) {
			return;
		}

		this.listenTo( this.editor.editing.view.document, 'selectLink', ( evt, data ) => {
			const model = this.toModel( data.domTarget );
			const templateElement = this.editor.templates.getElementInfo( model.name );
			const attrs = getModelAttributes( templateElement, model );

			if ( !attrs.linkitAttrs ) {
				attrs.linkitAttrs = {};
			}

			attrs.linkitAttrs.editorData = this.editor.getData();

			attrs.href = attrs[ 'link-target' ];
			delete attrs[ 'link-target' ];
			this._linkSelector( attrs, values => {
				this.editor.editing.view.focus();
				this.editor.model.change( writer => {
					values[ 'link-target' ] = values.href;
					delete values.href;
					writer.setAttributes( values, model );
				} );
			} );
		} );

		this.editor.conversion.for( 'downcast' ).attributeToAttribute( {
			model: 'link-target',
			view: 'link-target',
		} );

		this.editor.conversion.for( 'upcast' ).attributeToAttribute( {
			view: 'link-target',
			model: 'link-target',
		} );

		// Default editing downcast conversions for template container elements without functionality.
		// @todo: fix "downcastTemplateElement"
		this.editor.conversion.for( 'editingDowncast' ).add( downcastTemplateElement( this.editor, {
			types: [ 'button' ],
			view: ( templateElement, modelElement, viewWriter ) => {
				return viewWriter.createContainerElement(
					'ck-button',
					getModelAttributes( templateElement, modelElement )
				);
			},
			converterPriority: 'high'
		} ) );

		// Postfix elements to make sure a templates structure is always correct.
		this.editor.templates.registerPostFixer( [ 'button' ], postfixTemplateElement );
	}

	// TODO: Straight copy from @amazee/ckeditor5-template/commands/remotecontrolcommand
	// Generalize this.
	toModel( domElement ) {
		const view = this.editor.editing.view.domConverter.mapDomToView( domElement );
		const viewPosition = this.editor.editing.view.createPositionAt( view, 'end' );
		return this.editor.editing.mapper.toModelPosition( viewPosition ).parent;
	}
}
