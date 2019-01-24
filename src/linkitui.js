/**
 * @module linkit/linkitui
 */

import LinkUI from '@ckeditor/ckeditor5-link/src/linkui';
import clickOutsideHandler from '@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler';

/**
 * The linkit UI plugin. It introduces the Link and Unlink buttons and the <kbd>Ctrl+K</kbd> keystroke.
 *
 * It uses the
 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon contextual balloon plugin}.
 *
 * @extends module:core/plugin~Plugin
 */
export default class LinkitUI extends LinkUI {
	/**
	 * Attaches actions that control whether the balloon panel containing the
	 * {@link #formView} is visible or not.
	 *
	 * @private
	 */
	_enableUserBalloonInteractions() {
		const viewDocument = this.editor.editing.view.document;

		// Handle click on view document and show panel when selection is placed inside the link element.
		// Keep panel open until selection will be inside the same link element.
		this.listenTo( viewDocument, 'click', () => {
			const parentLink = this._getSelectedLinkElement();

			if ( parentLink ) {
				// Then show panel but keep focus inside editor editable.
				this._showUI();
			}
		} );

		// Focus the form if the balloon is visible and the Tab key has been pressed.
		this.editor.keystrokes.set( 'Tab', ( data, cancel ) => {
			if ( this._areActionsVisible && !this.actionsView.focusTracker.isFocused ) {
				this.actionsView.focus();
				cancel();
			}
		}, {
			// Use the high priority because the link UI navigation is more important
			// than other feature's actions, e.g. list indentation.
			// https://github.com/ckeditor/ckeditor5-link/issues/146
			priority: 'high'
		} );

		// Close the panel on the Esc key press when the editable has focus and the balloon is visible.
		this.editor.keystrokes.set( 'Esc', ( data, cancel ) => {
			if ( this._isUIVisible ) {
				this._hideUI();
				cancel();
			}
		} );

		// Close on click outside of balloon panel element.
		clickOutsideHandler( {
			emitter: this.formView,
			activator: () => this._isUIVisible,
			contextElements: [ this._balloon.view.element ],
			callback: () => {
				if ( !this._isUIInPanel ) {
					return;
				}

				// Remove form first because it's on top of the stack.
				this._removeFormView();

				// Then remove the actions view because it's beneath the form.
				this._balloon.remove( this.actionsView );
			}
		} );
	}

	/**
	 * Makes the UI react to the {@link module:core/editor/editorui~EditorUI#event:update} event to
	 * reposition itself when the editor ui should be refreshed.
	 *
	 * See: {@link #_hideUI} to learn when the UI stops reacting to the `update` event.
	 *
	 * @protected
	 */
	_startUpdatingUI() {
		const editor = this.editor;
		const viewDocument = editor.editing.view.document;

		let prevSelectedLink = this._getSelectedLinkElement();
		let prevSelectionParent = getSelectionParent();

		this.listenTo( editor.ui, 'update', () => {
			const selectedLink = this._getSelectedLinkElement();
			const selectionParent = getSelectionParent();

			// Hide the panel if:
			//
			// * the selection went out of the EXISTING link element. E.g. user moved the caret out
			//   of the link,
			// * the selection went to a different parent when creating a NEW link. E.g. someone
			//   else modified the document.
			// * the selection has expanded (e.g. displaying link actions then pressing SHIFT+Right arrow).
			//
			// Note: #_getSelectedLinkElement will return a link for a non-collapsed selection only
			// when fully selected.
			if ( ( prevSelectedLink && !selectedLink ) ||
				( !prevSelectedLink && selectionParent !== prevSelectionParent ) ) {
				this._hideUI();
			}
			// Update the position of the panel when:
			//  * the selection remains in the original link element,
			//  * there was no link element in the first place, i.e. creating a new link
			else {
				// If still in a link element, simply update the position of the balloon.
				// If there was no link (e.g. inserting one), the balloon must be moved
				// to the new position in the editing view (a new native DOM range).

				// TODO: Check if we can remove it.
				// this._balloon.updatePosition( this._getBalloonPositionData() );
			}

			prevSelectedLink = selectedLink;
			prevSelectionParent = selectionParent;
		} );

		function getSelectionParent() {
			return viewDocument.selection.focus.getAncestors()
				.reverse()
				.find( node => node.is( 'element' ) );
		}
	}

	/**
	 * Shows the right kind of the UI for current state of the command. It's either
	 * {@link #formView} or {@link #actionsView}.
	 *
	 * @private
	 */
	_showUI() {
		const editor = this.editor;
		const linkCommand = editor.commands.get( 'link' );

		if ( !linkCommand.isEnabled ) {
			return;
		}

		// When there's no link under the selection, go straight to the editing UI.
		if ( !this._getSelectedLinkElement() ) {
			this._addFormView();
		}
		// If theres a link under the selection...
		else {
			// Go to the editing UI if actions are already visible.
			if ( this._areActionsVisible ) {
				this._addFormView();
			}
			// Otherwise display just the actions UI.
			else {
				this._addActionsView();
			}
		}

		// Begin responding to ui#update once the UI is added.
		this._startUpdatingUI();
	}

	/**
	 * Adds the {@link #formView} to the {@link #_balloon}.
	 *
	 * @protected
	 */
	_addFormView() {
		if ( this._isFormInPanel ) {
			return;
		}

		const editor = this.editor;
		const linkCommand = editor.commands.get( 'link' );
		const viewDocument = editor.editing.view.document;

		this._linkSelector = editor.config.get( 'drupalLinkSelector' ) ? editor.config.get( 'drupalLinkSelector' ).callback : null;
		if ( this._linkSelector ) {
			const attrs = {};
			if ( linkCommand.attributes ) {
				for ( const [ key, value ] of linkCommand.attributes ) {
					attrs[ key ] = value;
				}
			}
			let data = editor.getData();

			if ( !attrs.linkitAttrs ) {
				attrs.linkitAttrs = {};
			}

			const selectionParent = getSelectionParent();
			if ( selectionParent && selectionParent.getAttribute( 'links-filter' ) ) {
				const filterClass = selectionParent.getAttribute( 'links-filter' );
				const parentFilter = selectionParent.getAttribute( 'links-filter-parent' );
				let selector = filterClass;

				if ( parentFilter ) {
					const parentCard = selectionParent.getAncestors().find( node => node.hasClass( parentFilter ) );
					if ( parentCard && parentCard.getAttribute( 'id' ) ) {
						selector = '#' + parentCard.getAttribute( 'id' ) + ' ' + filterClass;
					}
				}

				const filteredData = editor.sourceElement.querySelectorAll( selector );

				let newData = '';
				for ( const item of filteredData ) {
					newData += item.outerHTML;
				}
				data = newData;

				attrs.linkitAttrs[ 'links-filter' ] = filterClass;
			}

			attrs.linkitAttrs.editorData = data;

			this._linkSelector( attrs.linkitAttrs, values => {
				editor.editing.view.focus();
				this.editor.execute( 'link', values );
			} );
		} else {
			this._balloon.add( {
				view: this.formView,
				position: this._getBalloonPositionData()
			} );

			this.formView.urlInputView.select();

			// Make sure that each time the panel shows up, the URL field remains in sync with the value of
			// the command. If the user typed in the input, then canceled the balloon (`urlInputView#value` stays
			// unaltered) and re-opened it without changing the value of the link command (e.g. because they
			// clicked the same link), they would see the old value instead of the actual value of the command.
			// https://github.com/ckeditor/ckeditor5-link/issues/78
			// https://github.com/ckeditor/ckeditor5-link/issues/123
			this.formView.urlInputView.inputView.element.value = linkCommand.value || '';
		}
		function getSelectionParent() {
			return viewDocument.selection.focus.getAncestors()
				.reverse()
				.find( node => node.is( 'element' ) );
		}
	}
}
