/*globals $, _, define */

// This is for displaying and editing attributes of different types
// They will be able to:
//  - render
//  - edit
define([
    './Field',
    'blob/BlobClient'
], function(
    Field,
    BlobClient
) {
    'use strict';
    var FILE_UPLOAD_INPUT = $('<input type="file" />'),
        FILE_DOWNLOAD_ANCHOR = $('<a target="_self"/>');

    var AttributeField = function(logger, parentEl, attr, y, width) {
        this._blobClient = new BlobClient({
            logger: logger.fork('BlobClient')
        });
        this.attr = attr;
        this.$icon = null;
        Field.call(this, parentEl, attr.name.replace(/_/g, ' '),
            attr.value, width, y);
    };

    _.extend(AttributeField.prototype, Field.prototype);

    AttributeField.prototype.isEmpty = function() {
        return this.attr.value === undefined || this.attr.value === null ||
            this.attr.value === '';
    };

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

                Field.prototype.createContent.call(this, width, y, name);
                this._enableFileHandlers();
            });
        } else {
            Field.prototype.createContent.call(this, width, y, this.attr.value);
        }
    };

    AttributeField.prototype._addDownloadLink = function(url, zoom) {
        this.createIcon('glyphicon-download', {
            el: FILE_DOWNLOAD_ANCHOR.clone(),
            zoom: zoom,
            url: url
        });
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

    AttributeField.prototype.hasIcon = function() {
        return this.isAsset() && this.attr.value;
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
            values = this.attr.type === 'boolean' ? ['true', 'false'] : this.attr.values;

        // Using a temp container for the editing
        container.css('top', position.top/this._zoom);
        container.css('left', position.left/this._zoom);
        container.css('position', 'absolute');
        container.css('width', width/this._zoom);
        container.css('zoom', this._zoom);
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
            dropdown.style.width = (width/this._zoom + arrowMargin)+ 'px';
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

    AttributeField.prototype.render = function(zoom) {
        this._zoom = zoom;
        if (this.isAsset() && this.attr.value) {
            var url = this._blobClient.getDownloadURL(this.attr.value);
            if (this.$icon) {
                this.$icon.remove();
            }
            this._addDownloadLink(url, zoom);
        }
    };

    AttributeField.prototype.uploadFile = function() {
        this._uploadFileInput.click();
    };

    return AttributeField;
});
