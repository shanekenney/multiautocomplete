(function($, Autocompleter){

    var PLUGIN_NAME = "MultiAutocompleter";

    $.fn.multiAutocomplete = function(dataSource, options) {

        return this.each(function() {

            var mac = new MultiAutocompleter(this, dataSource, options);
            $.data(mac.$container[0], PLUGIN_NAME, mac);
        });
    };

    MultiAutocompleter.prototype = {

        constructor: $.MultiAutocompleter,
        addSelection: addSelection,
        addTileToList: addTileToList,
        removeSelection: removeSelection,
        previousSelection: previousSelection,
        getCursorRow: getCursorRow,
        getTotalRows: getTotalRows,
        resizeInput: resizeInput,
        getInputLength: getInputLength,
        renderTiles: renderTiles,
        pushRow: pushRow,
        popRow: popRow
    }

    function MultiAutocompleter(el, dataSource, options) {

        this.defaults = {
          containerClass: ".mac-container",
          selectionsClass: ".mac-selections",
          selectionItemClass: ".mac-selection",
          deleteSelectionClass: ".mac-delete-selection",
          inputItemClass: ".mac-search",
          textInputClass: ".mac-input",
          textInputWidth: 20,
          lineHeight: 25
        }

        this.options = $.extend({}, $.Autocompleter.defaults, this.defaults, options, {
          width: 199,
          multiple: false
        });

        var control = _renderControl(el, this.options);
        control.acInput.autocomplete(dataSource, this.options)
               .bind("keydown", _keyPressed)
               .bind("result", _itemSelected);

        this.$input = $(el);

        this.$container = control.container;
        this.$container.click(_containerClick);

        this.$selections = control.selections;
        this.$selections.height(this.options.lineHeight);
        this.$selections.width(this.$input.outerWidth());

        this.$inputItem = control.inputItem;
        this.$acInput = control.acInput;

        var inputMargin = new Number(this.$inputItem.css("margin-top").slice(0, -2));
        this.$acInput.height(this.options.lineHeight - (inputMargin * 2));

        this.renderTiles(this.$input.val());

        $.valHooks.text = {
            set: function(elem, value) {
                var mac = _getInstance(elem);
                mac && mac.renderTiles(value);
            }
        };
    }

    // Adds a new tile to the input area.
    function addSelection(value) {

        var value = this.$input.val() === "" ? value : this.$input.val() + this.options.multipleSeparator + value;
        this.$input.val(value);
    }

    function addTileToList(value) {

        var selection = $("<li/>", {
          "class": this.options.selectionItemClass.slice(1)
        });

        var deleteEl = $("<span/>", {
          "class": this.options.deleteSelectionClass.slice(1)
        });

        deleteEl.click(_itemDeleted);

        selection.text(value)
                 .append(deleteEl)
                 .insertBefore(this.$inputItem);

        if(this.getCursorRow() > this.getTotalRows())
            this.pushRow();
    }

    // Removes a specified tile from the input area.
    function removeSelection(target) {

        var item = target,
            currentVal = this.$input.val();

        var values = currentVal.split(this.options.multipleSeparator);
        values.splice(item.index(), 1);

        this.$input.val(values.join(this.options.multipleSeparator));
        item.remove();
    }

    // Gets the last tile that was added to the input area.
    function previousSelection() {

        var _selection = this.$selections
                             .children(this.options.selectionItemClass)
                             .last();

        return _selection.length > 0 ? _selection : null;
    }

    // Gets the row on which the cursor is currently on.
    function getCursorRow() {
        return (this.$acInput.parent().position().top + this.options.lineHeight) / this.options.lineHeight;
    }

    // Gets the total number of rows in the input area.
    function getTotalRows() {
        return this.$selections.height() / this.options.lineHeight;
    }

    function getInputLength() {

        var length,
            measureDiv = $("<div />", {
                style: "position: absolute; left: -1000px, top: -1000px; display: none; padding: 0; margin: 0;"
            });

        measureDiv.text(this.$acInput.val());
        this.$container.append(measureDiv);

        length = measureDiv.width();
        measureDiv.remove();

        return length;
    }

    function renderTiles(value) {

        var self = this,
            initialValues = value.split(this.options.multipleSeparator);

        this.$selections.children(this.options.selectionItemClass).remove();
        $.each(initialValues, function(index, value) {
            value != "" && self.addTileToList(value);
        });
    }

    // Adds a new row to the end of the input area.
    function pushRow() {
        this.$selections.css("height", "+=" + this.options.lineHeight);
    }

    // Removes the last row of the input area.
    function popRow() {
        this.$selections.css("height", "-=" + this.options.lineHeight);
    }

    // Calculates the required size of the input area depending
    // on the value that is currently entered.
    function resizeInput() {

        var padding = this.options.textInputWidth,
            currentValue = this.$acInput.val(),
            requiredLength = this.getInputLength() + padding;

        // Early exit if we've run out of room to expand.
        if(requiredLength >= this.$selections.width()) return;

        this.$acInput.width(requiredLength);
    }


    function _renderControl(inputElement, options) {

        var container = $("<div/>", {
            "id": "mac-" + inputElement.id,
            "class": options.containerClass.slice(1)
        });

        $(inputElement).hide()
                       .wrap(container);

        container = $("#mac-" + inputElement.id);

        var selections = $("<ul/>", {
            "class": options.selectionsClass.slice(1)
        });

        var inputItem = $("<li/>", {
            "class": options.inputItemClass.slice(1)
        });

        var input = $("<input/>", {
            "class": options.textInputClass.slice(1)
        });

        container.append(
            selections.append(
                inputItem.append(
                    input)));

        return {
          container: container,
          selections: $(options.selectionsClass, container),
          inputItem: $(options.inputItemClass, container),
          acInput: $(options.textInputClass, container),
        };
    }

    function _containerClick() {
        var mac = _getInstance(this);
        mac.$acInput.focus();
    }

    function _keyPressed(event) {

        var Key = {
            BACKSPACE: 8,
            DELETE: 46,
            isPrintChar: function(key) {
                return key > 31 && key < 127;
            }
        };

        var mac = _getInstance(event.target);

        // Expand the input field as the user types.
        if(Key.isPrintChar(event.keyCode) || Key.BACKSPACE === event.keyCode)
            mac.resizeInput();

        if(Key.BACKSPACE === event.keyCode && mac.$acInput.val() === "") {

            var selection = mac.previousSelection();

            if(selection && selection.children(mac.options.deleteSelectionClass).hasClass("active")) {
                mac.removeSelection(selection);
            }
            else {
                selection && selection.children(mac.options.deleteSelectionClass).addClass("active");
            }
        }
        else {

            var selection = mac.previousSelection();
            selection && selection.children(mac.options.deleteSelectionsClass).removeClass("active");
        }

        // Expand the input area if the input area wraps to a new line.
        mac.getCursorRow() > mac.getTotalRows() && mac.pushRow();
        // Contract the input area if the input area is now too big. I.e. After a delete.
        mac.getCursorRow() < mac.getTotalRows() && mac.popRow();
    }

    function _itemSelected(event, data, value) {

        var mac = _getInstance(event.target),
            selectionsHeight = mac.$selections.height();

        mac.$acInput.width(mac.options.textInputWidth)
                      .val("");

        mac.addSelection(value);
    }

    function _itemDeleted(event) {

       var mac = _getInstance(event.target);
       mac.removeSelection($(event.target).parent());

       if(mac.getCursorRow() < mac.getTotalRows())
           mac.popRow();
    }

    function _getInstance(element) {
        return $.data($(element).closest("div")[0], PLUGIN_NAME);
    }

})($, $.Autocompleter);
// JQuery and Autocompleter dependencies.
