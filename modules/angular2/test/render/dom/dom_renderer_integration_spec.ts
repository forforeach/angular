import {
  AsyncTestCompleter,
  beforeEach,
  ddescribe,
  describe,
  el,
  expect,
  iit,
  inject,
  it,
  xit,
  beforeEachBindings,
  SpyObject,
} from 'angular2/test_lib';

import {MapWrapper} from 'angular2/src/facade/collection';
import {DOM} from 'angular2/src/dom/dom_adapter';

import {DomTestbed, TestRootView, elRef} from './dom_testbed';

import {
  ViewDefinition,
  RenderDirectiveMetadata,
  RenderViewRef,
  ViewEncapsulation
} from 'angular2/src/render/api';

export function main() {
  describe('DomRenderer integration', () => {
    beforeEachBindings(() => [DomTestbed]);

    it('should create and destroy root host views while using the given elements in place',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compiler.compileHost(someComponent)
             .then((hostProtoViewDto) => {
               var view = new TestRootView(
                   tb.renderer.createRootHostView(hostProtoViewDto.render, 0, '#root'));
               expect(tb.rootEl.parentNode).toBeTruthy();
               expect(view.hostElement).toEqual(tb.rootEl);

               tb.renderer.detachFragment(view.fragments[0]);
               tb.renderer.destroyView(view.viewRef);
               expect(tb.rootEl.parentNode).toBeFalsy();

               async.done();
             });
       }));

    it('should update text nodes',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(
               someComponent,
               [
                 new ViewDefinition(
                     {componentId: 'someComponent', template: '{{a}}', directives: []})
               ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings);

               tb.renderer.setText(rootView.viewRef, 0, 'hello');
               expect(rootView.hostElement).toHaveText('hello');
               async.done();
             });
       }));


    it('should update any element property/attributes/class/style independent of the compilation on the root element and other elements',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<input [title]="y" style="position:absolute">',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {

               var checkSetters = (elr, el) => {
                 tb.renderer.setElementProperty(elr, 'tabIndex', 1);
                 expect((<HTMLInputElement>el).tabIndex).toEqual(1);

                 tb.renderer.setElementClass(elr, 'a', true);
                 expect(DOM.hasClass(el, 'a')).toBe(true);
                 tb.renderer.setElementClass(elr, 'a', false);
                 expect(DOM.hasClass(el, 'a')).toBe(false);

                 tb.renderer.setElementStyle(elr, 'width', '10px');
                 expect(DOM.getStyle(el, 'width')).toEqual('10px');
                 tb.renderer.setElementStyle(elr, 'width', null);
                 expect(DOM.getStyle(el, 'width')).toEqual('');

                 tb.renderer.setElementAttribute(elr, 'someAttr', 'someValue');
                 expect(DOM.getAttribute(el, 'some-attr')).toEqual('someValue');
               };

               var rootView = tb.createView(protoViewMergeMappings);
               // root element
               checkSetters(elRef(rootView.viewRef, 0), rootView.hostElement);
               // nested elements
               checkSetters(elRef(rootView.viewRef, 1), DOM.firstChild(rootView.hostElement));

               async.done();
             });
       }));

    if (DOM.supportsDOMEvents()) {
      it('should call actions on the element independent of the compilation',
         inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
           tb.compileAndMerge(someComponent,
                              [
                                new ViewDefinition({
                                  componentId: 'someComponent',
                                  template: '<input [title]="y"></input>',
                                  directives: []
                                })
                              ])
               .then((protoViewMergeMappings) => {
                 var rootView = tb.createView(protoViewMergeMappings);

                 tb.renderer.invokeElementMethod(elRef(rootView.viewRef, 1), 'setAttribute',
                                                 ['a', 'b']);

                 expect(DOM.getAttribute(DOM.childNodes(rootView.hostElement)[0], 'a'))
                     .toEqual('b');
                 async.done();
               });
         }));
    }

    it('should add and remove fragments',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<template>hello</template>',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings);

               var elr = elRef(rootView.viewRef, 1);
               expect(rootView.hostElement).toHaveText('');
               var fragment = rootView.fragments[1];
               tb.renderer.attachFragmentAfterElement(elr, fragment);
               expect(rootView.hostElement).toHaveText('hello');
               tb.renderer.detachFragment(fragment);
               expect(rootView.hostElement).toHaveText('');

               async.done();
             });
       }));

    it('should add and remove empty fragments',
       inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<template></template><template></template>',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings);

               var elr = elRef(rootView.viewRef, 1);
               expect(rootView.hostElement).toHaveText('');
               var fragment = rootView.fragments[1];
               var fragment2 = rootView.fragments[2];
               tb.renderer.attachFragmentAfterElement(elr, fragment);
               tb.renderer.attachFragmentAfterFragment(fragment, fragment2);
               tb.renderer.detachFragment(fragment);
               tb.renderer.detachFragment(fragment2);
               expect(rootView.hostElement).toHaveText('');

               async.done();
             });
       }));

    it('should handle events', inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
         tb.compileAndMerge(someComponent,
                            [
                              new ViewDefinition({
                                componentId: 'someComponent',
                                template: '<input (change)="doSomething()">',
                                directives: []
                              })
                            ])
             .then((protoViewMergeMappings) => {
               var rootView = tb.createView(protoViewMergeMappings);

               tb.triggerEvent(elRef(rootView.viewRef, 1), 'change');
               var eventEntry = rootView.events[0];
               // bound element index
               expect(eventEntry[0]).toEqual(1);
               // event type
               expect(eventEntry[1]).toEqual('change');
               // actual event
               expect((<Map<any, any>>eventEntry[2]).get('$event').type).toEqual('change');
               async.done();
             });

       }));

    if (DOM.supportsNativeShadowDOM()) {
      describe('native shadow dom support', () => {
        it('should put the template into a shadow root',
           inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
             tb.compileAndMerge(someComponent,
                                [
                                  new ViewDefinition({
                                    componentId: 'someComponent',
                                    template: 'hello',
                                    directives: [],
                                    encapsulation: ViewEncapsulation.NATIVE
                                  })
                                ])
                 .then((protoViewMergeMappings) => {
                   var rootView = tb.createView(protoViewMergeMappings);
                   expect(DOM.getShadowRoot(rootView.hostElement)).toHaveText('hello');
                   async.done();
                 });

           }));

        it('should add styles from non native components to shadow roots while the view is not destroyed',
           inject([AsyncTestCompleter, DomTestbed], (async, tb: DomTestbed) => {
             tb.compileAndMerge(someComponent,
                                [
                                  new ViewDefinition({
                                    componentId: 'someComponent',
                                    template: '',
                                    directives: [],
                                    encapsulation: ViewEncapsulation.NATIVE,
                                    styles: ['a {};']
                                  })
                                ])
                 .then((protoViewMergeMappings) => {
                   var rootView = tb.createView(protoViewMergeMappings);
                   tb.compiler.compile(new ViewDefinition({
                                componentId: 'someComponent',
                                template: '',
                                directives: [],
                                encapsulation: ViewEncapsulation.NONE,
                                styles: ['b {};']
                              }))
                       .then(_ => {
                         expect(DOM.getShadowRoot(rootView.hostElement)).toHaveText('a {};b {};');
                         tb.renderer.destroyView(rootView.viewRef);
                         tb.compiler.compile(new ViewDefinition({
                                      componentId: 'someComponent',
                                      template: '',
                                      directives: [],
                                      encapsulation: ViewEncapsulation.NONE,
                                      styles: ['c {};']
                                    }))
                             .then(_ => {
                               expect(DOM.getShadowRoot(rootView.hostElement))
                                   .toHaveText('a {};b {};');
                               async.done();
                             });

                       });
                 });
           }));

      });
    }


  });
}

export var someComponent = RenderDirectiveMetadata.create(
    {id: 'someComponent', type: RenderDirectiveMetadata.COMPONENT_TYPE, selector: 'some-comp'});
