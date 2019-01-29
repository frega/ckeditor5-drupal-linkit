/**
 * @module link/unlinkcommand
 */

import findLinkRange from '@ckeditor/ckeditor5-link/src/findlinkrange';
import TemplateCommandBase from '@amazee/ckeditor5-template/src/commands/templatecommandbase';

/**
 * The unlink command. It is used by the {@link module:link/link~Link link plugin}.
 *
 * @extends module:core/command~Command
 */
export default class UnlinkLinkitCommand extends TemplateCommandBase {
	/**
	 * Check if a given template and model element are applicable for this command.
	 *
	 * @param {module:template/utils/elementinfo~ElementInfo} templateElement
	 * @param {module:engine/model/element~Element} modelElement
	 */
	// eslint-disable-next-line no-unused-vars
	matchElement( templateElement, modelElement ) {
		return templateElement.type === 'button';
	}

	/**
     * @inheritDoc
     */
	refresh() {
		super.refresh();
		this.isEnabled =
				!this._currentElement &&
				( this.editor.model.document.selection.hasAttribute( 'linkHref' ) ||
				this.editor.model.document.selection.hasAttribute( 'linkitAttrs' ) );
	}

	/**
   * Executes the command.
   *
   * When the selection is collapsed, removes the `linkHref` attribute from each node with the same `linkHref` attribute value.
   * When the selection is non-collapsed, removes the `linkHref` attribute from each node in selected ranges.
   *
   * @fires execute
   */
	execute() {
		const model = this.editor.model;
		const selection = model.document.selection;

		if ( selection.isCollapsed ) {
			return;
		}

		model.change( writer => {
			// Get ranges to unlink.
			const rangesToUnlink = selection.isCollapsed ?
				[ findLinkRange( selection.getFirstPosition(), selection.getAttribute( 'linkHref' ) ) ] : selection.getRanges();

			// Remove `linkHref` attribute from specified ranges.
			for ( const range of rangesToUnlink ) {
				writer.removeAttribute( 'linkHref', range );
				writer.removeAttribute( 'linkitAttrs', range );
			}
		} );
	}
}
