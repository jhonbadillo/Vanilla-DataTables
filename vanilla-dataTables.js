/*!
 *
 * Vanilla-DataTables
 * Copyright (c) 2015-2017 Karl Saunders (http://mobiuswebdesign.co.uk)
 * Licensed under MIT (http://www.opensource.org/licenses/mit-license.php)
 *
 * Version: 1.1.9
 *
 */
(function(root, factory) {
	var plugin = 'DataTable';

	if (typeof define === 'function' && define.amd) {
		define([], factory(plugin));
	} else if (typeof exports === 'object') {
		module.exports = factory(plugin);
	} else {
		root[plugin] = factory(plugin);
	}
}(this, function(plugin) {
	'use strict';

	/* PRIVATE VARS */

	var util = {
		extend: function(src, props) {
			var p;
			for (p in props) {
				if (props.hasOwnProperty(p)) {
					if ("[object Object]" === Object.prototype.toString.call(src[p])) {
						util.extend(src[p], props[p]);
					} else {
						src[p] = props[p];
					}
				}
			}
			return src;
		},
		each: function(a, b, c) {
			if ("[object Object]" === Object.prototype.toString.call(a)) {
				for (var d in a) {
					if (Object.prototype.hasOwnProperty.call(a, d)) {
						b.call(c, d, a[d], a);
					}
				}
			} else {
				for (var e = 0, f = a.length; e < f; e++) {
					b.call(c, e, a[e], a);
				}
			}
		},
		createElement: function(a, b) {
			var c = document,
				d = c.createElement(a);
			if (b && "object" == typeof b) {
				var e;
				for (e in b) {
					if ("html" === e) {
						d.innerHTML = b[e];
					} else if ("text" === e) {
						d.appendChild(c.createTextNode(b[e]));
					} else {
						d.setAttribute(e, b[e]);
					}
				}
			}
			return d;
		},
		createFragment: function() {
			return document.createDocumentFragment();
		},
		hasClass: function(a, b) {
			return a.classList ? a.classList.contains(b) : !!a.className && !!a.className.match(new RegExp("(\\s|^)" + b + "(\\s|$)"));
		},
		addClass: function(a, b) {
			if (!util.hasClass(a, b)) {
				if (a.classList) {
					a.classList.add(b);
				} else {
					a.className = a.className.trim() + " " + b;
				}
			}
		},
		removeClass: function(a, b) {
			if (util.hasClass(a, b)) {
				if (a.classList) {
					a.classList.remove(b);
				} else {
					a.className = a.className.replace(new RegExp("(^|\\s)" + b.split(" ").join("|") + "(\\s|$)", "gi"), " ");
				}
			}
		},
		append: function(p, e) {
			return p && e && p.appendChild(e);
		},
		on: function(e, type, callback, scope) {
			e.addEventListener(type, function(e) {
				callback.call(scope || this, e);
			}, false);
		},
		isObject: function(a) {
			return "[object Object]" === Object.prototype.toString.call(a);
		},
		isArray: function(a) {
			return "[object Array]" === Object.prototype.toString.call(a);
		},
		isInt: function(val) {
			return !isNaN(val) && (function(x) {
				return (x || 0) === x;
			})(parseFloat(val));
		},
		getBoundingRect: function(el) {
			var win = window;
			var doc = document;
			var body = doc.body;
			var rect = el.getBoundingClientRect();
			var offsetX = win.pageXOffset !== undefined ? win.pageXOffset : (doc.documentElement || body.parentNode || body).scrollLeft;
			var offsetY = win.pageYOffset !== undefined ? win.pageYOffset : (doc.documentElement || body.parentNode || body).scrollTop;

			return {
				bottom: rect.bottom + offsetY,
				height: rect.height,
				left: rect.left + offsetX,
				right: rect.right + offsetX,
				top: rect.top + offsetY,
				width: rect.width
			};
		},
		preventDefault: function(e) {
			e = e || window.event;
			if (e.preventDefault) {
				return e.preventDefault();
			}
		},
		includes: function(a, b) {
			return a.indexOf(b) > -1;
		},
		button: function(c, p, t) {
			return util.createElement('li', {
				class: c,
				html: '<a href="#" data-page="' + p + '">' + t + '</a>'
			});
		},
		flush: function(el, ie) {
			if ( el instanceof NodeList ) {
				util.each(el, function(i,e) {
					util.flush(e, ie);
				});
			} else {
				if (ie) {
					while (el.hasChildNodes()) {
						el.removeChild(el.firstChild);
					}
				} else {
					el.innerHTML = '';
				}
			}
		}
	};

	var build = function() {
		var o = this.options;
		var template = "";

		// Event listeners
		Emitter.mixin(this);

		// Convert data to HTML
		if (o.data) {
			dataToTable.call(this);
		}

		// Store references
		this.tbody = this.table.tBodies[0];
		this.tHead = this.table.tHead;
		this.tFoot = this.table.tFoot;

		// Make a tHead if there isn't one (fixes #8)
		if ( !this.tHead ) {
			var h = util.createElement("thead");
			var t = util.createElement("tr");
			util.each(this.tbody.rows[0].cells, function(i, cell) {
				util.append(t, util.createElement("th"));
			});
			util.append(h, t);
			this.tHead = h;
		}

		// Header
		if ( !o.header ) {
			if ( this.tHead ) {
				this.table.removeChild(this.table.tHead);
			}
		}

		// Footer
		if ( o.footer ) {
			if ( this.tHead && !this.tFoot) {
				this.tFoot = util.createElement('tfoot', {
					html: this.tHead.innerHTML
				});
				this.table.appendChild(this.tFoot);
			}
		} else {
			if ( this.tFoot ) {
				this.table.removeChild(this.table.tFoot);
			}
		}

		// Build
		this.wrapper = util.createElement('div', {
			class: 'dataTable-wrapper',
		});

		// Template for custom layouts
		template += "<div class='dataTable-top'>";
		template += o.layout.top;
		template += "</div>";
		template += "<div class='dataTable-container'></div>";
		template += "<div class='dataTable-bottom'>";
		template += o.layout.bottom;
		template += "</div>";

		// Info placement
		template = template.replace("{info}", "<div class='dataTable-info'></div>");

		// Per Page Select
		if (o.perPageSelect) {
			var wrap = "<div class='dataTable-dropdown'><label>";
			wrap += o.labels.perPage;
			wrap += "</label></div>";

			// Create the select
			var select = util.createElement('select', {
				class: 'dataTable-selector'
			});

			// Create the options
			util.each(o.perPageSelect, function(i, val) {
				var selected = val === o.perPage;
				var option = new Option(val, val, selected, selected);
				select.add(option);
			});

			// Custom label
			wrap = wrap.replace("{select}", select.outerHTML);

			// Selector placement
			template = template.replace("{select}", wrap);
		} else {
			template = template.replace("{select}", "");
		}

		// Searchable
		if (o.searchable) {
			var form = "<div class='dataTable-search'><input class='dataTable-input' placeholder='"+o.labels.placeholder+"' type='text'></div>";

			// Search input placement
			template = template.replace("{search}", form);
		} else {
			template = template.replace("{search}", "");
		}

		// Sortable
		var cols = this.tHead.rows[0].cells;

		util.each(cols, function(i, th) {
			th.idx = i;

			if (o.sortable) {
				var link = util.createElement('a', {
					href: '#',
					class: 'dataTable-sorter',
					html: th.innerHTML
				});
				th.innerHTML = '';
				util.append(th, link);
			}
		});

		// Add table class
		util.addClass(this.table, 'dataTable-table');

		// Paginator
		var w = util.createElement('div', {
			class: 'dataTable-pagination'
		});
		var paginator = util.createElement('ul');
		util.append(w, paginator);

		// Pager(s) placement
		template = template.replace(/\{pager\}/g, w.outerHTML);

		this.wrapper.innerHTML = template;

		this.container = this.wrapper.querySelector(".dataTable-container");

		this.paginators = this.wrapper.querySelectorAll(".dataTable-pagination");

		this.label = this.wrapper.querySelector(".dataTable-info");

		// Insert in to DOM tree
		this.table.parentNode.replaceChild(this.wrapper, this.table);
		this.container.appendChild(this.table);

		// Store the table dimensions
		this.rect = util.getBoundingRect(this.table);

		// Convert rows to array for processing
		this.rows = Array.prototype.slice.call(this.tbody.rows);

		// Update
		this.update();

		// Fixed height
		if (o.fixedHeight) {
			fixHeight.call(this);
		}

		// Fixed column widths
		if (o.fixedColumns) {
			var cells, hd = false;

			// If we have a headings we need only set the widths on them
			// otherwise we need a temp header and the widths need applying to all cells
			if (this.table.tHead) {
				cells = this.table.tHead.rows[0].cells;

				util.each(cells, function(i, cell) {
					var rect = util.getBoundingRect(cell);
					var w = (rect.width / this.rect.width) * 100;
					cell.style.width = w + '%';
				}, this);
			} else {

				cells = [];

				// Make temperary headings
				hd = util.createElement("thead");
				var r = util.createElement("tr");
				var c = this.table.tBodies[0].rows[0].cells;
				util.each(c, function(i, row) {
					var th = util.createElement("th");
					r.appendChild(th);
					cells.push(th);
				});

				hd.appendChild(r);
				this.table.insertBefore(hd, this.table.tBodies[0]);

				var widths = [];
				util.each(cells, function(i, cell) {
					var rect = util.getBoundingRect(cell);
					var w = (rect.width / this.rect.width) * 100;
					widths.push(w);
				}, this);

				util.each(this.rows, function(idx, row) {
					util.each(row.cells, function(i, cell) {
						cell.style.width = widths[i] + "%";
					});
				});

				// Discard the temp header
				this.table.removeChild(hd);
			}
		}

		setClassNames.call(this);
		addEventListeners.call(this);
	};

	var setClassNames = function() {
		var o = this.options;
		if ( !o.header ) {
			util.addClass(this.wrapper, 'no-header'); }

		if ( !o.footer ) {
			util.addClass(this.wrapper, 'no-footer'); }

		if ( o.sortable ) {
			util.addClass(this.wrapper, 'sortable'); }

		if (o.searchable) {
			util.addClass(this.wrapper, 'searchable'); }

		if (o.fixedHeight) {
			util.addClass(this.wrapper, 'fixed-height'); }

		if ( o.fixedColumns ) {
			util.addClass(this.wrapper, 'fixed-columns'); }
	};

	var addEventListeners = function() {
		var that = this, o = that.options;

		// Per page selector
		if ( o.perPageSelect ) {
			var selector = that.wrapper.querySelector(".dataTable-selector");
			if ( selector ) {
				// Change per page
				util.on(selector, 'change', function(e) {
					o.perPage = parseInt(this.value, 10);
					that.update();

					if (o.fixedHeight) {
						fixHeight.call(that);
					}

					that.emit('datatable.perpage');
				});
			}
		}

		// Search input
		if ( o.searchable ) {
			that.input = that.wrapper.querySelector(".dataTable-input");
			if ( that.input ) {
				util.on(that.input, 'keyup', function(e) {
					that.search(this.value);
				});
			}
		}

		// Pager(s)
		util.on(that.wrapper, 'click', function(e) {
			var t = e.target;
			if (t.nodeName.toLowerCase() === 'a' && t.hasAttribute('data-page')) {
				util.preventDefault(e);
				that.page(t.getAttribute('data-page'));
			}
		});

		// Sort items
		if ( o.sortable ) {
			util.on(that.tHead, 'click', function(e) {
				e = e || window.event;
				var target = e.target;

				if (target.nodeName.toLowerCase() === 'a') {
					if (util.hasClass(target, 'dataTable-sorter')) {
						util.preventDefault(e);
						that.sortColumn(target.parentNode.idx + 1);
					}
				}
			});
		}
	};

	// Sort the rows into pages
	var paginate = function() {
		var perPage = this.options.perPage,
			rows = !!this.searching ? this.searchData : this.rows;

		this.pages = rows.map(function(tr, i) {
			return i % perPage === 0 ? rows.slice(i, i + perPage) : null;
		}).filter(function(page) {
			return page;
		});

		this.totalPages = this.lastPage = this.pages.length;
	};

	// Render a page
	var render = function() {

		if (this.totalPages) {

			if (this.currentPage > this.totalPages) {
				this.currentPage = 1;
			}

			// Use a fragment to limit touching the DOM
			var index = this.currentPage - 1,
				frag = util.createFragment();

			util.each(this.pages[index], function(i, v) {
				util.append(frag, v);
			});

			this.clear(frag);

			this.onFirstPage = false;
			this.onLastPage = false;

			switch (this.currentPage) {
				case 1:
					this.onFirstPage = true;
					break;
				case this.lastPage:
					this.onLastPage = true;
					break;
			}
		}

		// Update the info
		var current = 0,
			f = 0,
			t = 0,
			items;

		if (this.totalPages) {
			current = this.currentPage - 1;
			f = current * this.options.perPage;
			t = f + this.pages[current].length;
			f = f + 1;
			items = !!this.searching ? this.searchData.length : this.rows.length;
		}

		if ( this.label && this.options.labels.info.length ) {

			// CUSTOM LABELS
			var string = this.options.labels.info.replace("{start}", f)
												.replace("{end}", t)
												.replace("{page}", this.currentPage)
												.replace("{pages}", this.totalPages)
												.replace("{rows}", items);

			this.label.innerHTML = items  ? string : "";
		}

		if (this.options.fixedHeight && this.currentPage == 1) {
			fixHeight.call(this);
		}
	};

	// Render the pager(s)
	var renderPager = function() {

		util.flush(this.paginators, this.isIE);

		if (this.totalPages <= 1) return;

		var c = 'pager',
			frag = util.createFragment(),
			prev = this.onFirstPage ? 1 : this.currentPage - 1,
			next = this.onlastPage ? this.totalPages : this.currentPage + 1;

		// first button
		if (this.options.firstLast) {
			util.append(frag, util.button(c, 1, this.options.firstText));
		}

		// prev button
		if (this.options.nextPrev) {
			util.append(frag, util.button(c, prev, this.options.prevText));
		}

		var pager = this.links;

		// truncate the links
		if (this.options.truncatePager) {
			pager = truncate(this.links, this.currentPage, this.pages.length, this.options.pagerDelta);
		}

		// active page link
		util.addClass(this.links[this.currentPage - 1], 'active');

		// append the links
		util.each(pager, function(i, p) {
			util.removeClass(p, 'active');
			util.append(frag, p);
		});

		util.addClass(this.links[this.currentPage - 1], 'active');

		// next button
		if (this.options.nextPrev) {
			util.append(frag, util.button(c, next, this.options.nextText));
		}

		// first button
		if (this.options.firstLast) {
			util.append(frag, util.button(c, this.totalPages, this.options.lastText));
		}

		// We may have more than one pager
		util.each(this.paginators, function(i,pager) {
			util.append(pager, frag.cloneNode(true));
		});
	};

	// Bubble sort algorithm
	var sortItems = function(a, b) {
		var c, d;
		if (1 === b) {
			c = 0;
			d = a.length;
		} else {
			if (b === -1) {
				c = a.length - 1;
				d = -1;
			}
		}
		for (var e = !0; e;) {
			e = !1;
			for (var f = c; f != d; f += b) {
				if (a[f + b] && a[f].value > a[f + b].value) {
					var g = a[f],
						h = a[f + b],
						i = g;
					a[f] = h;
					a[f + b] = i;
					e = !0;
				}
			}
		}
		return a;
	};

	// Fix container heigh
	var fixHeight = function() {
		this.container.style.height = null;
		this.rect = util.getBoundingRect(this.container);
		this.container.style.height = this.rect.height + 'px';
	};

	// Pager truncation algorithm
	var truncate = function(a, b, c, d) {
		d = d || 2;
		var j, e = 2 * d,
			f = b - d,
			g = b + d,
			h = [],
			i = [];
		if (b < 4 - d + e) {
			g = 3 + e;
		} else if (b > c - (3 - d + e)) {
			f = c - (2 + e);
		}
		for (var k = 1; k <= c; k++) {
			if (1 == k || k == c || k >= f && k <= g) {
				var l = a[k - 1];
				util.removeClass(l, "active");
				h.push(l);
			}
		}
		util.each(h, function(b, c) {
			var d = c.children[0].getAttribute("data-page");
			if (j) {
				var e = j.children[0].getAttribute("data-page");
				if (d - e == 2) i.push(a[e]);
				else if (d - e != 1) {
					var f = util.createElement("li", {
						class: "ellipsis",
						html: '<a href="#">&hellip;</a>'
					});
					i.push(f);
				}
			}
			i.push(c);
			j = c;
		});

		return i;
	};

	// Parse data to HTML
	var dataToTable = function(data) {
		var thead = false,
			tbody = false;

		data = data || this.options.data;

		if (data.headings) {
			thead = util.createElement('thead');
			var tr = util.createElement('tr');
			util.each(data.headings, function(i, col) {
				var td = util.createElement('th', {
					html: col
				});
				tr.appendChild(td);
			});

			thead.appendChild(tr);
		}

		if (data.rows) {
			tbody = util.createElement('tbody');
			util.each(data.rows, function(i, rows) {
				if (data.headings) {
					if (data.headings.length !== rows.length) {
						throw new Error("The number of rows do not match the number of headings.");
					}
				}
				var tr = util.createElement('tr');
				util.each(rows, function(k, value) {
					var td = util.createElement('td', {
						html: value
					});
					tr.appendChild(td);
				});
				tbody.appendChild(tr);
			});
		}

		if (thead) {
			if (this.table.tHead !== null) {
				this.table.removeChild(this.table.tHead);
			}
			util.append(this.table, thead);
		}

		if (tbody) {
			if (this.table.tBodies.length) {
				this.table.removeChild(this.table.tBodies[0]);
			}
			util.append(this.table, tbody);
		}
	};

	// Event emitter
	var Emitter = function() {};
	Emitter.prototype = {
		on: function(event, fct) {
			this._events = this._events || {};
			this._events[event] = this._events[event] || [];
			this._events[event].push(fct);
		},
		off: function(event, fct) {
			this._events = this._events || {};
			if (event in this._events === false) return;
			this._events[event].splice(this._events[event].indexOf(fct), 1);
		},
		emit: function(event /* , args... */ ) {
			this._events = this._events || {};
			if (event in this._events === false) return;
			for (var i = 0; i < this._events[event].length; i++) {
				this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
			}
		}
	};

	Emitter.mixin = function(obj) {
		var props = ['on', 'off', 'emit'];
		for (var i = 0; i < props.length; i++) {
			if (typeof obj === 'function') {
				obj.prototype[props[i]] = Emitter.prototype[props[i]];
			} else {
				obj[props[i]] = Emitter.prototype[props[i]];
			}
		}
		return obj;
	};

	/////////////////
	//	DATATABLE	//
	////////////////

	function DataTable(table, options) {

		var defaults = {
			perPage: 10,
			perPageSelect: [5, 10, 15, 20, 25],

			sortable: true,
			searchable: true,

			// Pagination
			nextPrev: true,
			firstLast: false,
			prevText: '&lsaquo;',
			nextText: '&rsaquo;',
			firstText: '&laquo;',
			lastText: '&raquo;',
			truncatePager: true,
			pagerDelta: 2,

			fixedColumns: true,
			fixedHeight: false,

			header: true,
			footer: false,

			// Customise the display text
			labels: {
				placeholder: "Search...", // The search input placeholder
				perPage: "{select} entries per page", // per-page dropdown label
				noRows: "No entries found", // Message shown when there are no search results
				info: "Showing {start} to {end} of {rows} entries", //
			},

			// Customise the layout
			layout: {
				top: "{select}{search}",
				bottom: "{info}{pager}"
			},
		};

		this.initialized = false;

		// user options
		this.options = util.extend(defaults, options);

		// Checks
		if (!table) {
			throw new Error("The plugin requires a table as the first parameter");
		}

		if (typeof table === "string") {
			var selector = table;
			table = document.querySelector(table);

			if (!table) {
				throw new Error("The element '" + selector + "' can not be found.");
			}
		}

		if (table.tagName.toLowerCase() !== "table") {
			throw new Error("The selected element is not a table.");
		}

		// Disable manual sorting if no header is present (#4)
		if ( !this.options.header ) {
			this.options.sortable = false;
		}

		if (table.tHead === null ) {
			if ( !this.options.data || (this.options.data && !this.options.data.headings) ) {
				this.options.sortable = false;
			}
		}

		if (!table.tBodies.length) {
			if (this.options.data) {
				if (!this.options.data.rows) {
					throw new Error("You seem to be using the data option, but you've not defined any rows.");
				}
			} else {
				throw new Error("You don't seem to have a tbody in your table.");
			}
		}

		if (table.tBodies.length && !table.tBodies[0].rows.length) {
			if (this.options.data) {
				if (!this.options.data.rows) {
					throw new Error("You seem to be using the data option, but you've not defined any rows.");
				}
			}
		}

		this.table = table;

		this.init();
	}

	/**
	 * Initialize the instance
	 * @param  {object} options
	 * @return {void}
	 */
	DataTable.prototype.init = function(options) {

		if ( this.initialized || util.hasClass(this.table, "dataTable-table") ) {
			return false;
		}

		var that = this;

		this.options = util.extend(this.options, options || {});

		// IE detection
		this.isIE = !!/(msie|trident)/i.test(navigator.userAgent);

		this.currentPage = 1;
		this.onFirstPage = true;

		build.call(this);

		setTimeout(function() {
			that.emit('datatable.init');
			that.initialized = true;
		}, 10);
	};

	/**
	 * Destroy the instance
	 * @return {void}
	 */
	DataTable.prototype.destroy = function() {
		var o = this.options;

		// Remove the sorters
		if ( o.sortable ) {
			util.each(this.tHead.rows[0].cells, function(i, th) {
				var html = th.firstElementChild.innerHTML;
				th.innerHTML = html;
				th.removeAttribute("style");
			}, this);
		}

		// Populate the table
		var f = util.createFragment();
		util.each(this.rows, function(i, tr) {
			f.appendChild(tr);
		}, this);
		this.clear(f);

		// Remove the className
		util.removeClass(this.table, "dataTable-table");

		// Remove the containers
		this.wrapper.parentNode.replaceChild(this.table, this.wrapper);

		this.initialized = false;
	};

	/**
	 * Update the instance
	 * @return {[type]} [description]
	 */
	DataTable.prototype.update = function() {

		paginate.call(this);
		render.call(this);

		this.links = [];

		var i = this.pages.length;
		while (i--) {
			var num = i + 1;
			this.links[i] = util.button((i === 0) ? 'active' : '', num, num);
		}

		renderPager.call(this);

		this.emit('datatable.update');
	};

	/**
	 * Perform a search of the data set
	 * @param  {string} query
	 * @return {void}
	 */
	DataTable.prototype.search = function(query) {

		query = query.toLowerCase();

		this.currentPage = 1;
		this.searching = true;
		this.searchData = [];

		if (!query.length) {
			this.searching = false;
			this.update();
			this.emit("datatable.search", query, this.searchData);
			util.removeClass(this.wrapper, 'search-results');
			return false;
		}

		this.clear();

		util.each(this.rows, function(idx, row) {
			var inArray = util.includes(this.searchData, row);

			// https://github.com/Mobius1/Vanilla-DataTables/issues/12
			var doesQueryMatch = query.split (" ").reduce (function (bool, word) {
				return bool && util.includes(row.textContent.toLowerCase(), word);
			}, true);

			// Cheat and get the row's textContent instead of searching each cell :P
			if (doesQueryMatch && !inArray) {
				this.searchData.push(row);
			}
		}, this);

		util.addClass(this.wrapper, 'search-results');

		if (!this.searchData.length) {
			util.removeClass(this.wrapper, 'search-results');
			this.setMessage(this.options.labels.noRows);
		}

		this.update();

		this.emit("datatable.search", query, this.searchData);
	};

	/**
	 * Change page
	 * @param  {int} page
	 * @return {void}
	 */
	DataTable.prototype.page = function(page) {
		// We don't want to load the current page again.
		if (page == this.currentPage) {
			return false;
		}

		if (!isNaN(page)) {
			this.currentPage = parseInt(page, 10);
		}

		if (page > this.pages.length || page < 0) {
			return false;
		}

		render.call(this);
		renderPager.call(this);

		this.emit('datatable.page', page);
	};

	/**
	 * Sort by column
	 * @param  {int} column - The column no.
	 * @param  {string} direction - asc or desc
	 * @return {void}
	 */
	DataTable.prototype.sortColumn = function(column, direction) {

		// Check column is present
		if ( column < 1 || column > this.tHead.rows[0].cells.length ) {
			return false;
		}

		// Convert to zero-indexed
		column = column - 1;

		var dir;
		var rows = !!this.searching ? this.searchData : this.rows;
		var alpha = [];
		var numeric = [];
		var a = 0;
		var n = 0;
		var th = this.tHead.rows[0].cells[column];

		util.each(rows, function(i, tr) {
			var cell = tr.cells[column];
			var content = cell.textContent;
			var num = content.replace(/(\$|\,|\s)/g, "");

			if (parseFloat(num) == num) {
				numeric[n++] = { value: Number(num), row: tr };
			} else {
				alpha[a++] = { value: content, row: tr };
			}
		});

		/* Sort according to direction (ascending or descending) */
		var top, btm;
		if (util.hasClass(th, "asc") || direction == "asc") {
			top = sortItems(alpha, -1);
			btm = sortItems(numeric, -1);
			dir = 'descending';
			util.removeClass(th, 'asc');
			util.addClass(th, 'desc');
		} else {
			top = sortItems(numeric, 1);
			btm = sortItems(alpha, 1);
			dir = 'ascending';
			util.removeClass(th, 'desc');
			util.addClass(th, 'asc');
		}

		/* Clear asc/desc class names from the last sorted column's th if it isn't the same as the one that was just clicked */
		if (this.lastTh && th != this.lastTh) {
			util.removeClass(this.lastTh, 'desc');
			util.removeClass(this.lastTh, 'asc');
		}

		this.lastTh = th;

		/* Reorder the table */
		rows = top.concat(btm);

		if (!!this.searching) {
			this.searchData = [];

			util.each(rows, function(i, v) {
				this.searchData.push(v.row);
			}, this);
		} else {
			this.rows = [];

			util.each(rows, function(i, v) {
				this.rows.push(v.row);
			}, this);
		}

		this.update();
		this.emit('datatable.sort', column, dir);
	};

	/**
	 * Add new row data
	 * @param {object} data
	 */
	DataTable.prototype.addRows = function(data) {
		if (Object.prototype.toString.call(data) !== '[object Object]') {
			throw new Error("Function addRows: The method requires an object.");
		}

		if (!data.rows) {
			throw new Error("Function addRows: Your object is missing the 'rows' property.");
		}

		var that = this;
		util.each(data.rows, function(i, row) {
			var tr = util.createElement("tr");
			util.each(row, function(a, val) {
				var td = util.createElement("td", {
					html: val
				});
				tr.appendChild(td);
			});
			that.rows.push(tr);
		});

		this.update();
	};

	/**
	 * Refresh the instance
	 * @return {void}
	 */
	DataTable.prototype.refresh = function() {
		if ( this.options.searchable ) {
			this.input.value = '';
			this.searching = false;
		}
		this.currentPage = 1;
		this.onFirstPage = true;
		this.update();

		this.emit("datatable.refresh");
	};

	/**
	 * Truncate the table
	 * @param  {mixes} html - HTML string or HTMLElement
	 * @return {void}
	 */
	DataTable.prototype.clear = function(html) {
		if (this.tbody) {
			util.flush(this.tbody, this.isIE);
		}

		var parent = this.tbody;
		if (!this.tbody) {
			parent = this.table;
		}

		if (html) {
			if ( typeof html === "string" ) {
				parent.innerHTML = html;
			} else {
				util.append(parent, html);
			}
		}
	};

	/**
	 * Export data
	 * @param  {string} type | Export type (csv only, for now)
	 * @param  {mixed} selection | single or array of page numbers
	 * @return {void}
	 */
	DataTable.prototype.export = function(type, filename, columnDelimiter, lineDelimiter, selection) {
		var that = this, rows = [], data = [], ctr, keys;

		if ( type === "csv" ) {
			// Include headings
			rows.push(this.tHead.rows[0]);
		}

		if ( selection ) {
			if ( util.isInt(selection) ) {
				var page = that.pages[selection - 1];
				util.each(page, function(i, p) {
					rows.push(p);
				});
			} else if ( util.isArray(selection) ) {
				util.each(selection, function(i, page) {

					page = that.pages[page-1];

					util.each(page, function(i, p) {
						rows.push(p);
					});
				});
			}
		} else {
			rows = rows.concat(this.rows);
		}

		if ( rows.length ) {

			if ( type === "csv" ) {
				var csv, link, j;

				columnDelimiter = columnDelimiter || ",";
				lineDelimiter =  lineDelimiter || "\n";

				util.each(rows, function(i, row) {
					j = 0;

					util.each(row.cells, function(x, cell) {
						if (j > 0) data.push(columnDelimiter);
						data.push(cell.textContent);
						j++;
					});
					data.push(lineDelimiter);
				});

				// Convert the array to string
				csv = data.join("");

				filename = filename || 'datatable_export';
				filename += ".csv";

				if (!csv.match(/^data:text\/csv/i)) {
					csv = 'data:text/csv;charset=utf-8,' + csv;
				}

				// Create a link to trigger the download
				csv = encodeURI(csv);
				link = util.createElement('a');
				link.setAttribute('href', csv);
				link.setAttribute('download', filename);

				document.body.appendChild(link);

				// Trigger the download
				link.click();

				document.body.removeChild(link);
			}

			this.emit("datatable.export", type, rows);
		}
	};

	/**
	 * Print the table
	 * @return {void}
	 */
	DataTable.prototype.print = function() {
		var headings = this.tHead.rows[0].cells;
		var rows = this.rows;
		var table = util.createElement("table");
		var thead = util.createElement("thead");
		var tbody = util.createElement("tbody");

		var tr = util.createElement("tr");
		util.each(headings, function(i, th) {
			tr.appendChild(util.createElement("th", {
				html: th.textContent
			}));
		});

		thead.appendChild(tr);

		util.each(rows, function(i, row) {
			var tr = util.createElement('tr');
			util.each(row.cells, function(k, cell) {
				tr.appendChild(util.createElement('td', {
					html: cell.textContent
				}));
			});
			tbody.appendChild(tr);
		});

		table.appendChild(thead);
		table.appendChild(tbody);

		// Open new window
		var w = window.open();

		// Append the table to the body
		w.document.body.appendChild(table);

		// Print
		w.print();

		this.emit("datatable.print", table);
	};

	/**
	 * Show a message in the table
	 * @param {string} message
	 */
	DataTable.prototype.setMessage = function(message) {
		var colspan = this.rows[0].cells.length;
		this.clear(util.createElement('tr', {
			html: '<td class="dataTables-empty" colspan="' + colspan + '">' + message + '</td>'
		}));
	};

	return DataTable;
}));