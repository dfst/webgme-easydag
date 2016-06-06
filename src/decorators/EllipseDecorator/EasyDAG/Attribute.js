/*globals $, define */

// This is for displaying and editing attributes of different types
// They will be able to:
//  - render
//  - edit
define([
    'blob/BlobClient'
], function(
    BlobClient
) {
    'use strict';
    var FILE_UPLOAD_INPUT = $('<input type="file" />'),
        FILE_DOWNLOAD_ANCHOR = $('<a target="_self"/>');

    var AttributeField = function(logger, parentEl, attr, y, width) {
        this._name = attr.name;
        this._blobClient = new BlobClient({
            logger: logger.fork('BlobClient')
        });
        this.name = this._name.replace(/_/g, ' ');  // Display name
        this.$parent = parentEl;
        this.attr = attr;
        this.$icon = null;
        this.isEmpty = !this.attr.value && this.attr.value !== 0;

        // Attribute name
        var leftCol = -width/2 + AttributeField.PADDING;

        this.$label = this.$parent.append('text')
            .attr('y', y)
            .attr('x', leftCol)
            .attr('font-style', 'italic')  // FIXME: move this to css
            .attr('class', 'attr-title')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .text(`${this.name}: `);

        // Attribute value
        this.createContent(width, y);

    };

    AttributeField.PADDING = 12,
    AttributeField.BUTTON_MARGIN = 12,
    AttributeField.prototype.EMPTY_MSG = '<none>';
    AttributeField.prototype.createContent = function(width, y) {
        if (this.attr.type === 'asset') {
            // Get the name using the blobclient
            this._blobClient.getMetadata(this.attr.value, (err, info) => {
                var name;

                if (err) {
                    name = 'ERROR';
                } else {
                    name = info.name;
                }

                this._createContent(width, y, name);
                this._enableFileHandlers();
            });
        } else {
            this._createContent(width, y);
        }
    };

    AttributeField.prototype._addDownloadLink = function(url) {
        if (this.attr.type === 'asset' && this.attr.value) {
            var html = this.$content[0][0],
                position = html.getBoundingClientRect(),
                parentHtml = $('body'),
                container = FILE_DOWNLOAD_ANCHOR.clone(),
                icon = $('<span/>');

            container.css('top', position.top);
            container.css('left', position.right + 5);
            container.css('position', 'absolute');
            container.attr('id', 'download-file-icon');
            container.attr('href', url);
            this.$icon = container;

            icon.attr('class', 'glyphicon glyphicon-download');

            container.append(icon);
            $(parentHtml).append(container);
        }
    };

    AttributeField.prototype._enableFileHandlers = function() {
        var url = this._blobClient.getDownloadURL(this.attr.value);
        this._uploadFileInput = FILE_UPLOAD_INPUT.clone();
        this._uploadFileInput.on('change', event => {
            this._fileSelectHandler(event);
        });
        this._downloadFile = FILE_DOWNLOAD_ANCHOR.clone();
        if (url) {
            this._downloadFile.attr('href', url);
        }
    };

    AttributeField.prototype._fileSelectHandler = function(event) {
        var self = this,
            i,
            file,

            files,
            afName,
            artifact,
            remainingFiles,

            addedFileAsSoftLink;

        // cancel event and hover styling
        event.stopPropagation();
        event.preventDefault();

        // fetch FileList object
        files = event.target.files || event.dataTransfer.files;

        // process all File objects
        if (files && files.length > 0) {
            //this._detachFileDropHandlers(true);

            afName = self.attr.name;
            artifact = this._blobClient.createArtifact(afName);

            remainingFiles = files.length;

            addedFileAsSoftLink = function (err, hash) {
                remainingFiles -= 1;

                if (err) {
                    //TODO: something went wrong, tell the user????
                } else {
                    // successfully uploaded
                }

                if (remainingFiles === 0) {
                    if (files.length > 1) {
                        artifact.save(function (err, artifactHash) {
                            self.saveAttribute(artifactHash);
                            //self.fireFinishChange();
                            //self._attachFileDropHandlers(false);
                        });

                    } else {
                        self.saveAttribute(hash);
                        //self.fireFinishChange();
                        //self._attachFileDropHandlers(false);
                    }
                }
            };

            for (i = 0; i < files.length; i += 1) {
                file = files[i];
                artifact.addFileAsSoftLink(file.name, file, addedFileAsSoftLink);
            }
        }
    };

    AttributeField.prototype._createContent = function(width, y, content) {
        var x = width/2 - AttributeField.PADDING;
        if (this.isAsset() && this.attr.value) {
            x -= AttributeField.BUTTON_MARGIN;
        }
        content = content || (this.isEmpty ? this.EMPTY_MSG : this.attr.value);
        this.$content = this.$parent.append('text')
            .attr('y', y)
            .attr('x', x)
            .attr('text-anchor', 'end')  // FIXME: move this to css
            .attr('dominant-baseline', 'middle')
            .text(`${content}`)
            .on('click', this.onClick.bind(this));

        if (this.isEmpty) {
            this.$content.attr('font-style', 'italic');
        }

    };

    AttributeField.prototype.onClick = function() {
        if (this.attr.type === 'asset') {
            this.uploadFile();
        } else {
            this.edit();
        }
    };

    AttributeField.prototype.edit = function() {
        // Edit the node's attribute
        var html = this.$content[0][0],
            position = html.getBoundingClientRect(),

            width = Math.max(position.right-position.left, 15),
            container = $('<div>'),
            parentHtml = $('body'),
            values = this.attr.values;

        // Using a temp container for the editing
        container.css('top', position.top);
        container.css('left', position.left);
        container.css('position', 'absolute');
        container.css('width', width);
        container.attr('id', 'CONTAINER-TMP');

        $(parentHtml).append(container);

        if (values) {  // Check if enum
            var dropdown = document.createElement('select'),
                option,
                self = this,
                arrowMargin = 30;

            for (var i = values.length; i--;) {
                option = document.createElement('option');
                option.setAttribute('value', values[i]);
                option.innerHTML = values[i];
                // set the default
                if (this.attr.value === values[i]) {
                    option.setAttribute('selected', 'selected');
                }
                dropdown.appendChild(option);
            }
            dropdown.style.width = (width + arrowMargin)+ 'px';
            container.append(dropdown);
            dropdown.focus();
            // on select
            dropdown.onblur = function() {
                if (this.value !== self.attr.value) {
                    self.saveAttribute(this.value);
                }
                container.remove();
            };

        } else {  // assuming just text
            container.editInPlace({
                enableEmpty: true,
                value: this.attr.value,
                css: {
                    'z-index': 10000,
                    'id': 'asdf',
                    'width': width,
                    'xmlns': 'http://www.w3.org/1999/xhtml'
                },
                onChange: (oldValue, newValue) => {
                    this.saveAttribute(newValue);
                },
                onFinish: function () {
                    $(this).remove();
                }
            });
        }
    };

    AttributeField.prototype.isAsset = function() {
        return this.attr.type === 'asset';
    };

    AttributeField.prototype.render = function() {
        if (this.isAsset() && this.attr.value) {
            var url = this._blobClient.getDownloadURL(this.attr.value);
            if (this.$icon) {
                this.$icon.remove();
            }
            this._addDownloadLink(url);
        }
    };

    AttributeField.prototype.width = function() {
        var elements = [this.$label, this.$content].map(el => el[0][0]);

        if (this.$icon) {
            elements.push(this.$icon[0]);
        }

        return elements.map(el => el.getBoundingClientRect().width)
            .reduce((a, b) => a+b, 0);
    };

    AttributeField.prototype.uploadFile = function() {
        this._uploadFileInput.click();
    };

    AttributeField.prototype.destroy = function() {
        if (this.$icon) {
            this.$icon.remove();
        }
    };

    return AttributeField;
});
