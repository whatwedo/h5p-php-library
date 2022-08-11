/*global H5P*/
H5P.Tooltip = (function () {
  "use strict";

  /**
   * Create an accessible tooltip
   *
   * @param {HTMLElement} triggeringElement The element that should trigger the tooltip
   * @param {Object} options Options for tooltip
   * @param {String} options.text The text to be displayed in the tooltip
   *  If not set, will attempt to set text = aria-label of triggeringElement
   * @param {String[]} options.classes Extra css classes for the tooltip
   * @param {Boolean} options.ariaHidden Whether the hover should be read by screen readers or not (default: true)
   * @param {String} options.position Where the tooltip should appear in relation to the
   *  triggeringElement. Accepted positions are "top" (default), "left", "right" and "bottom"
   *
   * @constructor
   */
  function Tooltip(triggeringElement, options) {

    /** @alias H5P.Tooltip */
    let self = this;

    // Make sure tooltips have unique id
    H5P.Tooltip.uniqueId += 1;
    const tooltipId = "h5p-tooltip-" + H5P.Tooltip.uniqueId;

    // Default options
    options = options || {};
    options.classes = options.classes || [];
    options.ariaHidden = options.ariaHidden || true;

    // Initiate state
    this.hover = false;
    this.focus = false;

    // Function used by the escape listener
    const escapeFunction = function (e) {
      if (e.key === 'Escape') {
        tooltip.classList.remove('h5p-tooltip-visible');
      }
    }

    // Create element
    const tooltip = document.createElement('div');

    tooltip.classList.add('h5p-tooltip');
    tooltip.id = tooltipId;
    tooltip.role = 'tooltip';
    tooltip.innerHTML = options.text || triggeringElement.getAttribute('aria-label') || '';
    tooltip.setAttribute('aria-hidden', options.ariaHidden);
    tooltip.classList.add(...options.classes);

    triggeringElement.appendChild(tooltip);

    // Use a mutation observer to listen for aria-label being
    // changed for the triggering element. If so, update the tooltip.
    // Mutation observer will be used even if the original elements
    // doesn't have any aria-label.
    new MutationObserver(function (mutations) {
      const ariaLabel = mutations[0].target.getAttribute('aria-label');
      if (ariaLabel) {
        tooltip.innerHTML = options.text || ariaLabel;
      }
    }).observe(triggeringElement, {
      attributes: true,
      attributeFilter: ['aria-label'],
    });

    // Set the initial position based on options.position
    switch (options.position) {
      case "left":
        tooltip.classList.add('h5p-tooltip-left');
        break;
      case "right":
        tooltip.classList.add('h5p-tooltip-right');
        break;
      case "bottom":
        tooltip.classList.add('h5p-tooltip-bottom');
        break;
      default:
        options.position = "top";
    }

    // Aria-describedby will override aria-hidden
    if (!options.ariaHidden) {
      triggeringElement.setAttribute('aria-describedby', tooltipId);
    }

    // Add event listeners to triggeringElement
    triggeringElement.addEventListener('mouseenter', function () {
      showTooltip(true);
    });
    triggeringElement.addEventListener('mouseleave', function () {
      hideTooltip(true);
    });
    triggeringElement.addEventListener('focusin', function () {
      showTooltip(false);
    });
    triggeringElement.addEventListener('focusout', function () {
      hideTooltip(false);
    });

    // Prevent clicks on the tooltip from triggering onClick listeners on the triggeringElement
    tooltip.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    /**
     * Makes the tooltip visible and activates it's functionality
     *
     * @param {Boolean} triggeredByHover True if triggered by mouse, false if triggered by focus
     */
    const showTooltip = function (triggeredByHover) {
      if (triggeredByHover) {
        self.hover = true;
      }
      else {
        self.focus = true;
      }

      tooltip.classList.add('h5p-tooltip-visible');

      // Add listener to iframe body, as esc keypress would not be detected otherwise
      document.body.addEventListener('keydown', escapeFunction, true);

      // h5p-container is more accurate, but not available in i.e. cp editor
      let container = document.getElementsByClassName('h5p-container');
      if (container) {
        container = container[0];
      }
      else {
        container = document.body;
      }

      // Ensure that all of the tooltip is visible
      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight;
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipOffsetTop = tooltip.offsetTop;
      const triggerWidth = triggeringElement.clientWidth;
      const triggerHeight = triggeringElement.clientHeight;
      const offsetLeft = triggeringElement.offsetLeft;
      const offsetTop = triggeringElement.offsetTop;
      const position = options.position;

      let adjusted = false;

      // Going out of screen on left side
      if ((position === "left" && (offsetLeft < tooltipWidth)) ||
        (offsetLeft + triggerWidth < tooltipWidth)) {
        tooltip.classList.add('h5p-tooltip-adjusted-right');
        tooltip.classList.remove('h5p-tooltip-adjusted-left');
        adjusted = true;
      }
      // Going out of screen on right side
      else if ((position === "right" && (offsetLeft + triggerWidth + tooltipWidth > availableWidth)) ||
        (offsetLeft + tooltipWidth > availableWidth)) {
        tooltip.classList.add('h5p-tooltip-adjusted-left');
        tooltip.classList.remove('h5p-tooltip-adjusted-right');
        adjusted = true;
      }

      // going out of top of screen
      if ((position === "top" && (offsetTop < -tooltipOffsetTop)) ||
        (offsetTop < tooltipOffsetTop)) {
        tooltip.classList.add('h5p-tooltip-adjusted-down');
        tooltip.classList.remove('h5p-tooltip-adjusted-up');
        adjusted = true;
      }
      // going out of bottom of screen
      else if ((position === "bottom" && (offsetTop + tooltipOffsetTop + tooltip.clientHeight > availableHeight)) ||
        (offsetTop + triggerHeight + tooltipOffsetTop > availableHeight)) {
        tooltip.classList.add('h5p-tooltip-adjusted-up');
        tooltip.classList.remove('h5p-tooltip-adjusted-down');
        adjusted = true;
      }

      // Reset adjustments
      if (!adjusted) {
        tooltip.classList.remove('h5p-tooltip-adjusted-down');
        tooltip.classList.remove('h5p-tooltip-adjusted-up');
        tooltip.classList.remove('h5p-tooltip-adjusted-left');
        tooltip.classList.remove('h5p-tooltip-adjusted-right');
      }
    }

    /**
     * Hides the tooltip and removes listeners
     *
     * @param {Boolean} triggeredByHover True if triggered by mouse, false if triggered by focus
     */
     const hideTooltip = function (triggeredByHover) {
      if (triggeredByHover) {
        self.hover = false;
      }
      else {
        self.focus = false;
      }

      // Only hide tooltip if neither hovered nor focused
      if (!self.hover && !self.focus) {
        tooltip.classList.remove('h5p-tooltip-visible');

        // Remove iframe body listener
        document.body.removeEventListener('keydown', escapeFunction, true);
      }
    }

    /**
     * Change the text displayed by the tooltip
     *
     * @param {String} text The new text to be displayed
     *  Set to null to use aria-label of triggeringElement instead
     */
    this.setText = function (text) {
      options.text = text;
      tooltip.innerHTML = options.text || triggeringElement.getAttribute('aria-label') || '';
    };

    /**
     * Retrieve tooltip
     *
     * @return {HTMLElement}
     */
    this.getElement = function () {
      return tooltip;
    };
  }

  return Tooltip;

})();

H5P.Tooltip.uniqueId = -1;
