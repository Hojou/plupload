/**
 * plupload.html4.js
 *
 * Copyright 2010, Ryan Demmer
 * Copyright 2009, Moxiecode Systems AB
 * Released under GPL License.
 *
 * License: http://www.plupload.com/license
 * Contributing: http://www.plupload.com/contributing
 */

// JSLint defined globals
/*global plupload:false, window:false */

(function(plupload) {
	function getById(id) {
		return document.getElementById(id);
	}

	/**
	 * HTML4 implementation. This runtime has no special features it uses an form that posts files into an hidden iframe.
	 *
	 * @static
	 * @class plupload.runtimes.Html4
	 * @extends plupload.Runtime
	 */
	plupload.runtimes.Html4 = plupload.addRuntime("html4", {
		/**
		 * Returns a list of supported features for the runtime.
		 *
		 * @return {Object} Name/value object with supported features.
		 */
		getFeatures : function() {
			// Only multipart feature
			return {
				multipart: true,
				
				/* IE and WebKit let you trigger file dialog programmatically while FF and Opera - do not, so we
				sniff for them here... probably not that good idea, but impossibillity of controlling cursor style 
				on top of add files button obviously feels even worse */
				canOpenDialog: navigator.userAgent.indexOf('WebKit') !== -1 || /*@cc_on!@*/false
			};
		},

		/**
		 * Initializes the upload runtime.
		 *
		 * @method init
		 * @param {plupload.Uploader} uploader Uploader instance that needs to be initialized.
		 * @param {function} callback Callback to execute when the runtime initializes or fails to initialize. If it succeeds an object with a parameter name success will be set to true.
		 */
		init : function(uploader, callback) {
			uploader.bind("Init", function(up) {
				var container = document.body, iframe, url = "javascript", currentFile,
					input, currentFileId, IE = /MSIE/.test(navigator.userAgent), mimes = [],
					filters = up.settings.filters, i, ext, type, y;

				// Convert extensions to mime types list
				for (i = 0; i < filters.length; i++) {
					ext = filters[i].extensions.split(/,/);

					for (y = 0; y < ext.length; y++) {
						type = plupload.mimeTypes[ext[y]];

						if (type) {
							mimes.push(type);
						}
					}
				}

				mimes = mimes.join(',');

				function createForm() {
					var form, input, bgcolor;

					// Setup unique id for form
					currentFileId = plupload.guid();

					// Create form
					form = document.createElement('form');
					form.setAttribute('id', 'form_' + currentFileId);
					form.setAttribute('method', 'post');
					form.setAttribute('enctype', 'multipart/form-data');
					form.setAttribute('encoding', 'multipart/form-data');
					form.setAttribute("target", up.id + '_iframe');
					form.style.position = 'absolute';

					// Create input and set attributes
					input = document.createElement('input');
					input.setAttribute('id', 'input_' + currentFileId);
					input.setAttribute('type', 'file');
					input.setAttribute('accept', mimes);
					input.setAttribute('size', 1);

					// Set input styles
					plupload.extend(input.style, {
						width : '100%',
						height : '100%',
						opacity : 0
					});

					// Show the container if shim_bgcolor is specified
					bgcolor = up.settings.shim_bgcolor;
					if (bgcolor) {
						form.style.background = bgcolor;
					}

					// no opacity in IE
					if (IE) {
						plupload.extend(input.style, {
							filter : "alpha(opacity=0)"
						});
					}

					// add change event
					plupload.addEvent(input, 'change', function(e) {
						var element = e.target, name, files = [];

						if (element.value) {
							getById('form_' + currentFileId).style.top = -0xFFFFF + "px";

							// Get file name
							name = element.value.replace(/\\/g, '/');
							name = name.substring(name.length, name.lastIndexOf('/') + 1);

							// Push files
							files.push(new plupload.File(currentFileId, name));

							// Create and position next form
							createForm();

							// Fire FilesAdded event
							if (files.length) {
								uploader.trigger("FilesAdded", files);
							}
						}
					});

					// append to container
					form.appendChild(input);
					container.appendChild(form);

					up.refresh();
				}


				function createIframe() {
					var temp = document.createElement('div');

					// Create iframe using a temp div since IE 6 won't be able to set the name using setAttribute or iframe.name
					temp.innerHTML = '<iframe id="' + up.id + '_iframe" name="' + up.id + '_iframe" src="' + url + ':&quot;&quot;" style="display:none"></iframe>';
					iframe = temp.firstChild;
					container.appendChild(iframe);

					// Add IFrame onload event
					plupload.addEvent(iframe, 'load', function(e) {
						var n = e.target, el, result;

						// Ignore load event if there is no file
						if (!currentFile) {
							return;
						}

						try {
							el = n.contentWindow.document || n.contentDocument || window.frames[n.id].document;
						} catch (ex) {
							// Probably a permission denied error
							up.trigger('Error', {
								code : plupload.SECURITY_ERROR,
								message : plupload.translate('Security error.'),
								file : currentFile
							});

							return;
						}

						// Get result
						result = el.documentElement.innerText || el.documentElement.textContent;

						// Assume no error
						if (result) {
							currentFile.status = plupload.DONE;
							currentFile.loaded = 1025;
							currentFile.percent = 100;

							up.trigger('UploadProgress', currentFile);
							up.trigger('FileUploaded', currentFile, {
								response : result
							});
						}
					});

					// Upload file
					up.bind("UploadFile", function(up, file) {
						var form, input;

						// File upload finished
						if (file.status == plupload.DONE || file.status == plupload.FAILED || up.state == plupload.STOPPED) {
							return;
						}

						// Get the form and input elements
						form = getById('form_' + file.id);
						input = getById('input_' + file.id);

						// Set input element name attribute which allows it to be submitted
						input.setAttribute('name', up.settings.file_data_name);

						// Store action
						form.setAttribute("action", up.settings.url);

						// Append multipart parameters
						plupload.each(plupload.extend({name : file.target_name || file.name}, up.settings.multipart_params), function(value, name) {
							var input = document.createElement('input');

							plupload.extend(input, {
								type : 'hidden',
								name : name,
								value : value
							});

							form.insertBefore(input, form.firstChild);
						});

						currentFile = file;

						// Hide the current form
						getById('form_' + currentFileId).style.top = -0xFFFFF + "px";

						form.submit();
						form.parentNode.removeChild(form);
					});
				}

				if (up.settings.container) {
					container = getById(up.settings.container);
					container.style.position = 'relative';
				}

				up.bind('StateChanged', function(up) {
					if (up.state == plupload.STARTED) {
						createIframe();
					}

					if (up.state == plupload.STOPPED) {
						window.setTimeout(function() {
							iframe.parentNode.removeChild(iframe);
						}, 0);
					}
				});

				// Refresh button, will reposition the input form
				up.bind("Refresh", function(up) {
					var browseButton, browsePos, browseSize, inputContainer, pzIndex;

					browseButton = getById(up.settings.browse_button);
					if (browseButton) {
						browsePos = plupload.getPos(browseButton, getById(up.settings.container));
						browseSize = plupload.getSize(browseButton);
						inputContainer = getById('form_' + currentFileId);
						inputFile = getById('input_' + currentFileId);
	
						plupload.extend(inputContainer.style, {
							top : browsePos.y + 'px',
							left : browsePos.x + 'px',
							width : browseSize.w + 'px',
							height : browseSize.h + 'px'
						});
						
						// for IE and WebKit place input element underneath the browse button and route onclick event 
						// TODO: revise when browser support for this feature will change
						if (up.features.canOpenDialog) {
							pzIndex = parseInt(browseButton.parentNode.style.zIndex);
							if (isNaN(pzIndex))
								pzIndex = 0;
								
							plupload.extend(browseButton.style, {
								position : 'relative',
								zIndex : pzIndex
							});
												
							plupload.extend(inputContainer.style, {
								zIndex : pzIndex - 1
							});
							
							// not using plupload.addEvent here, cause there should be only one click event attached
							browseButton.onclick = function(e) {
								inputFile.click();
								return false;
							};
						}
						
						/* Since we have to place input[type=file] on top of the browse_button for some browsers (FF, Opera),
						browse_button loses interactivity, here we try to neutralize this issue highlighting browse_button
						with a special class
						TODO: needs to be revised as things will change */
						hoverClass = uploader.settings.browse_button_hover || 'plupload-hover';
						hoverElement = uploader.features.canOpenDialog ? browseButton : inputFile;
						
						hoverElement.onmouseover = function() {
							plupload.addClass(browseButton, hoverClass);	
						};
						hoverElement.onmouseout = function() {
							plupload.removeClass(browseButton, hoverClass);
						};
					}
				});

				// Remove files
				uploader.bind("FilesRemoved", function(up, files) {
					var i, n;

					for (i = 0; i < files.length; i++) {
						n = getById('form_' + files[i].id);
						n.parentNode.removeChild(n);
					}
				});

				// Create initial form
				createForm();
			});

			callback({success : true});
		}
	});
})(plupload);
