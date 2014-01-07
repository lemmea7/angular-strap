'use strict';

angular.module('mgcrea.ngStrap.modal', ['mgcrea.ngStrap.jqlite.dimensions'])

  .run(function($templateCache) {
    var template = '<div class="modal" tabindex="-1" role="dialog"><div class="modal-dialog"><div class="modal-content"><div class="modal-header" ng-show="title"><button type="button" class="close" ng-click="$hide()">&times;</button><h4 class="modal-title" ng-bind-html="title"></h4></div><div class="modal-body" ng-show="content" ng-bind-html="content"></div><div class="modal-footer"><button type="button" class="btn btn-default" ng-click="$hide()">Close</button></div></div></div></div>';
    $templateCache.put('$modal', template);
  })

  .provider('$modal', function() {

    var defaults = this.defaults = {
      animation: 'animation-fade',
      prefixClass: 'modal',
      placement: 'top',
      template: '$modal',
      container: false,
      element: null,
      backdrop: true,
      keyboard: true,
      show: true
    };

    this.$get = function($window, $rootScope, $compile, $q, $templateCache, $http, $animate, $timeout, dimensions) {

      var forEach = angular.forEach;
      var jqLite = angular.element;
      var trim = String.prototype.trim;
      var bodyElement = jqLite($window.document.body);
      var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;
      var findElement = function(query, element) {
        return jqLite((element || document).querySelectorAll(query));
      };

      function ModalFactory(config) {

        var $modal = {};

        // Common vars
        var options = angular.extend({}, defaults, config);
        $modal.$promise = $q.when($templateCache.get(options.template) || $http.get(options.template/*, {cache: true}*/));
        var scope = $modal.$scope = options.scope && options.scope.$new() || $rootScope.$new();
        if(!options.element && !options.container) {
          options.container = 'body';
        }

        // Support scope as string options
        if(!options.scope) {
          forEach(['title', 'content'], function(key) {
            if(options[key]) scope[key] = options[key];
          });
        }

        // Provide scope helpers
        scope.$hide = function() {
          scope.$$postDigest(function() {
            $modal.hide();
          });
        };
        scope.$show = function() {
          scope.$$postDigest(function() {
            $modal.show();
          });
        };
        scope.$toggle = function() {
          scope.$$postDigest(function() {
            $modal.toggle();
          });
        };

        // Fetch, compile then initialize modal
        var modalLinker, modalElement;
        var backdropElement = jqLite('<div class="' + options.prefixClass + '-backdrop"/>');
        $modal.$promise.then(function(template) {
          if(angular.isObject(template)) template = template.data;
          template = trim.apply(template);
          modalLinker = $compile(template);
          // modalElement = modalLinker(scope);
          $modal.init();
        });

        $modal.init = function() {
          if(options.show) {
            scope.$$postDigest(function() {
              $modal.show();
            });
          }
        };

        $modal.destroy = function() {

          // Remove element
          modalElement.remove();
          backdropElement.remove();

          // Destroy scope
          scope.$destroy();
        };

        $modal.show = function() {

          var parent = options.container ? findElement(options.container) : null;
          var after = options.container ? null : options.element;

          // Fetch a cloned element linked from template
          modalElement = $modal.$element = modalLinker(scope, function(clonedElement, scope) {});

          // Set the initial positioning.
          modalElement.css({display: 'block'}).addClass(options.placement);

          // Options: animation
          if(options.animation) {
            if(options.backdrop) {
              backdropElement.addClass('animation-fade');
            }
            modalElement.addClass(options.animation);
          }

          if(options.backdrop) {
            $animate.enter(backdropElement, bodyElement, null, function() {});
          }
          $animate.enter(modalElement, parent, after, function() {});
          scope.$isShown = true;
          scope.$digest();
          $modal.focus();
          bodyElement.addClass(options.prefixClass + '-open');

          // Bind events
          if(options.backdrop) {
            modalElement.on('click', hideOnBackdropClick);
          }
          if(options.keyboard) {
            modalElement.on('keyup', hideOnKeyUp);
          }

        };

        $modal.hide = function() {

          $animate.leave(modalElement, function() {
            bodyElement.removeClass('modal-open');
          });
          if(options.backdrop) {
            $animate.leave(backdropElement, function() {});
          }
          scope.$digest();
          scope.$isShown = false;

          // Unbind events
          if(options.backdrop) {
            modalElement.off('click', hideOnBackdropClick);
          }
          if(options.keyboard) {
            modalElement.off('keyup', hideOnKeyUp);
          }

        };

        $modal.toggle = function() {

          scope.$isShown ? $modal.hide() : $modal.show();

        };

        $modal.focus = function() {

          modalElement[0].focus();

        };

        // Private methods

        function hideOnBackdropClick(evt) {
          if(evt.target !== evt.currentTarget) return;
          options.backdrop === 'static' ? $modal.focus() : $modal.hide();
        }

        function hideOnKeyUp(evt) {
          evt.which === 27 && $modal.hide();
        }

        return $modal;

      }

      return ModalFactory;

    };

  })

  .directive('bsModal', function($window, $location, $sce, $modal) {

    var forEach = angular.forEach;
    var isDefined = angular.isDefined;
    var requestAnimationFrame = $window.requestAnimationFrame || $window.setTimeout;

    return {
      restrict: 'EAC',
      scope: true,
      link: function postLink(scope, element, attr, transclusion) {

        // Directive options
        var options = {scope: scope, element: element, show: false};
        forEach(['template', 'placement', 'backdrop', 'keyboard', 'show', 'container', 'animation'], function(key) {
          if(isDefined(attr[key])) options[key] = attr[key];
        });

        // Support scope as data-attrs
        forEach(['title', 'content'], function(key) {
          attr[key] && attr.$observe(key, function(newValue, oldValue) {
            scope[key] = newValue;
          });
        });

        // Support scope as an object
        attr.bsModal && scope.$watch(attr.bsModal, function(newValue, oldValue) {
          if(angular.isObject(newValue)) {
            angular.extend(scope, newValue);
          } else {
            scope.content = newValue;
          }
        }, true);

        // Initialize modal
        var modal = $modal(options);

        // Trigger
        element.on(attr.trigger || 'click', modal.toggle);

        // Garbage collection
        scope.$on('$destroy', function() {
          modal.destroy();
          options = null;
          modal = null;
        });

      }
    };

  });
