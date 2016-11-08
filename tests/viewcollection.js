/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global document */
/* bender-tags: ui */

import CKEditorError from 'ckeditor5/utils/ckeditorerror.js';
import Collection from 'ckeditor5/utils/collection.js';
import testUtils from 'tests/core/_utils/utils.js';
import View from 'ckeditor5/ui/view.js';
import ViewCollection from 'ckeditor5/ui/viewcollection.js';
import Template from 'ckeditor5/ui/template.js';
import normalizeHtml from 'tests/utils/_utils/normalizehtml.js';

let collection;

testUtils.createSinonSandbox();

describe( 'ViewCollection', () => {
	beforeEach( createTestCollection );

	describe( 'constructor()', () => {
		it( 'sets basic properties and attributes', () => {
			expect( collection.locale ).to.be.undefined;
			expect( collection.ready ).to.be.false;
			expect( collection._parentElement ).to.be.null;
			expect( collection._boundItemsToViewsMap ).to.be.instanceOf( Map );
		} );

		it( 'accepts locale and defines the locale property', () => {
			const locale = { t() {} };

			expect( new ViewCollection( locale ).locale ).to.equal( locale );
		} );

		it( 'manages view#element of the children in DOM', () => {
			const parentElement = document.createElement( 'p' );
			collection.setParent( parentElement );

			const viewA = new View();

			expect( () => {
				collection.add( viewA );
				collection.remove( viewA );
			} ).to.not.throw();

			expect( () => {
				collection.ready = true;
				collection.add( viewA );
				collection.remove( viewA );
			} ).to.not.throw();

			viewA.element = document.createElement( 'b' );
			collection.add( viewA );

			expect( normalizeHtml( parentElement.outerHTML ) ).to.equal( '<p><b></b></p>' );

			const viewB = new View();
			viewB.element = document.createElement( 'i' );

			collection.add( viewB, 0 );
			expect( normalizeHtml( parentElement.outerHTML ) ).to.equal( '<p><i></i><b></b></p>' );

			collection.remove( viewA );
			expect( normalizeHtml( parentElement.outerHTML ) ).to.equal( '<p><i></i></p>' );

			collection.remove( viewB );
			expect( normalizeHtml( parentElement.outerHTML ) ).to.equal( '<p></p>' );
		} );
	} );

	describe( 'init()', () => {
		it( 'should return a promise', () => {
			expect( collection.init() ).to.be.instanceof( Promise );
		} );

		it( 'should throw if already initialized', () => {
			return collection.init()
				.then( () => {
					collection.init();

					throw new Error( 'This should not be executed.' );
				} )
				.catch( err => {
					expect( err ).to.be.instanceof( CKEditorError );
					expect( err.message ).to.match( /ui-viewcollection-init-reinit/ );
				} );
		} );

		it( 'calls #init on all views in the collection', () => {
			const viewA = new View();
			const viewB = new View();

			viewA.element = document.createElement( 'a' );
			viewB.element = document.createElement( 'b' );

			const spyA = testUtils.sinon.spy( viewA, 'init' );
			const spyB = testUtils.sinon.spy( viewB, 'init' );

			collection.setParent( document.body );

			collection.add( viewA );
			collection.add( viewB );

			return collection.init().then( () => {
				sinon.assert.calledOnce( spyA );
				sinon.assert.calledOnce( spyB );
				sinon.assert.callOrder( spyA, spyB );

				expect( viewA.element.parentNode ).to.equal( collection._parentElement );
				expect( viewA.element.nextSibling ).to.equal( viewB.element );
				expect( collection.ready ).to.be.true;
			} );
		} );
	} );

	describe( 'destroy()', () => {
		it( 'should return a promise', () => {
			expect( collection.destroy() ).to.be.instanceof( Promise );
		} );

		it( 'calls #destroy on all views in the collection', () => {
			const viewA = new View();
			const viewB = new View();

			const spyA = testUtils.sinon.spy( viewA, 'destroy' );
			const spyB = testUtils.sinon.spy( viewB, 'destroy' );

			collection.add( viewA );
			collection.add( viewB );

			return collection.destroy().then( () => {
				sinon.assert.calledOnce( spyA );
				sinon.assert.calledOnce( spyB );
				sinon.assert.callOrder( spyA, spyB );
			} );
		} );
	} );

	describe( 'add', () => {
		it( 'returns a promise', () => {
			expect( collection.add( {} ) ).to.be.instanceof( Promise );
		} );

		it( 'initializes the new view in the collection', () => {
			let view = new View();
			let spy = testUtils.sinon.spy( view, 'init' );

			expect( collection.ready ).to.be.false;
			expect( view.ready ).to.be.false;

			return collection.add( view ).then( () => {
				expect( collection.ready ).to.be.false;
				expect( view.ready ).to.be.false;

				sinon.assert.notCalled( spy );

				view = new View();
				spy = testUtils.sinon.spy( view, 'init' );

				collection.ready = true;

				return collection.add( view ).then( () => {
					expect( view.ready ).to.be.true;

					sinon.assert.calledOnce( spy );
				} );
			} );
		} );
	} );

	describe( 'setParent', () => {
		it( 'sets #_parentElement', () => {
			const el = {};
			expect( collection._parentElement ).to.be.null;

			collection.setParent( el );
			expect( collection._parentElement ).to.equal( el );
		} );
	} );

	describe( 'bindTo', () => {
		class ViewClass extends View {
			constructor( locale, data ) {
				super( locale );

				this.template = new Template( {
					tag: 'b'
				} );

				this.data = data;
			}
		}

		it( 'provides "as" interface', () => {
			const returned = collection.bindTo( {} );

			expect( returned ).to.have.keys( 'as' );
			expect( returned.as ).to.be.a( 'function' );
		} );

		describe( 'as', () => {
			it( 'does not chain', () => {
				const returned = collection.bindTo( new Collection() ).as( ViewClass );

				expect( returned ).to.be.undefined;
			} );

			it( 'binds collection as a view factory – initial content', () => {
				const locale = {};
				const items = new Collection();

				items.add( { id: '1' } );
				items.add( { id: '2' } );

				collection = new ViewCollection( locale );
				collection.bindTo( items ).as( ViewClass );

				expect( collection ).to.have.length( 2 );
				expect( collection.get( 0 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 1 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 0 ).locale ).to.equal( locale );
				expect( collection.get( 1 ).data ).to.equal( items.get( 1 ) );
			} );

			it( 'binds collection as a view factory – new content', () => {
				const locale = {};
				const items = new Collection();

				collection = new ViewCollection( locale );
				collection.bindTo( items ).as( ViewClass );

				expect( collection ).to.have.length( 0 );

				items.add( { id: '1' } );
				items.add( { id: '2' } );

				expect( collection ).to.have.length( 2 );
				expect( collection.get( 0 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 1 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 0 ).locale ).to.equal( locale );
				expect( collection.get( 1 ).data ).to.equal( items.get( 1 ) );
			} );

			it( 'binds collection as a view factory – item removal', () => {
				const locale = {};
				const items = new Collection();

				collection = new ViewCollection( locale );
				collection.bindTo( items ).as( ViewClass );

				expect( collection ).to.have.length( 0 );

				items.add( { id: '1' } );
				items.add( { id: '2' } );

				expect( collection ).to.have.length( 2 );
				expect( collection.get( 0 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 1 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 0 ).locale ).to.equal( locale );
				expect( collection.get( 1 ).data ).to.equal( items.get( 1 ) );

				items.remove( 1 );
				expect( collection.get( 0 ).data ).to.equal( items.get( 0 ) );

				items.remove( 0 );
				expect( collection ).to.have.length( 0 );
			} );

			it( 'binds collection as a view factory – custom factory', () => {
				const locale = {};
				const items = new Collection();

				collection = new ViewCollection( locale );
				collection.bindTo( items ).as( ( item ) => {
					return new ViewClass( locale, item );
				} );

				expect( collection ).to.have.length( 0 );

				items.add( { id: '1' } );
				items.add( { id: '2' } );

				expect( collection ).to.have.length( 2 );
				expect( collection.get( 0 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 1 ) ).to.be.instanceOf( ViewClass );
				expect( collection.get( 0 ).locale ).to.equal( locale );
				expect( collection.get( 1 ).data ).to.equal( items.get( 1 ) );
			} );
		} );
	} );

	describe( 'delegate', () => {
		it( 'should throw when event names are not strings', () => {
			expect( () => {
				collection.delegate();
			} ).to.throw( CKEditorError, /ui-viewcollection-delegate-wrong-events/ );

			expect( () => {
				collection.delegate( new Date() );
			} ).to.throw( CKEditorError, /ui-viewcollection-delegate-wrong-events/ );

			expect( () => {
				collection.delegate( 'color', new Date() );
			} ).to.throw( CKEditorError, /ui-viewcollection-delegate-wrong-events/ );
		} );

		it( 'returns object', () => {
			expect( collection.delegate( 'foo' ) ).to.be.an( 'object' );
		} );

		it( 'provides "to" interface', () => {
			const delegate = collection.delegate( 'foo' );

			expect( delegate ).to.have.keys( 'to' );
			expect( delegate.to ).to.be.a( 'function' );
		} );

		describe( 'to', () => {
			it( 'does not chain', () => {
				const returned = collection.delegate( 'foo' ).to( {} );

				expect( returned ).to.be.undefined;
			} );

			it( 'forwards an event to another observable – existing view', ( done ) => {
				const target = new View();
				const view = new View();

				collection.add( view );
				collection.delegate( 'foo' ).to( target );

				target.on( 'foo', ( ...args ) => {
					assertDelegated( args, {
						expectedName: 'foo',
						expectedSource: view,
						expectedPath: [ view, target ],
						expectedData: []
					} );

					done();
				} );

				view.fire( 'foo' );
			} );

			it( 'forwards an event to another observable – new view', ( done ) => {
				const target = new View();
				const view = new View();

				collection.delegate( 'foo' ).to( target );
				collection.add( view );

				target.on( 'foo', ( ...args ) => {
					assertDelegated( args, {
						expectedName: 'foo',
						expectedSource: view,
						expectedPath: [ view, target ],
						expectedData: []
					} );

					done();
				} );

				view.fire( 'foo' );
			} );

			it( 'forwards multiple events to another observable', () => {
				const target = new View();
				const viewA = new View();
				const viewB = new View();
				const viewC = new View();
				const spyFoo = sinon.spy();
				const spyBar = sinon.spy();
				const spyBaz = sinon.spy();

				collection.delegate( 'foo', 'bar', 'baz' ).to( target );
				collection.add( viewA );
				collection.add( viewB );
				collection.add( viewC );

				target.on( 'foo', spyFoo );
				target.on( 'bar', spyBar );
				target.on( 'baz', spyBaz );

				viewA.fire( 'foo' );

				sinon.assert.calledOnce( spyFoo );
				sinon.assert.notCalled( spyBar );
				sinon.assert.notCalled( spyBaz );

				assertDelegated( spyFoo.args[ 0 ], {
					expectedName: 'foo',
					expectedSource: viewA,
					expectedPath: [ viewA, target ],
					expectedData: []
				} );

				viewB.fire( 'bar' );

				sinon.assert.calledOnce( spyFoo );
				sinon.assert.calledOnce( spyBar );
				sinon.assert.notCalled( spyBaz );

				assertDelegated( spyBar.args[ 0 ], {
					expectedName: 'bar',
					expectedSource: viewB,
					expectedPath: [ viewB, target ],
					expectedData: []
				} );

				viewC.fire( 'baz' );

				sinon.assert.calledOnce( spyFoo );
				sinon.assert.calledOnce( spyBar );
				sinon.assert.calledOnce( spyBaz );

				assertDelegated( spyBaz.args[ 0 ], {
					expectedName: 'baz',
					expectedSource: viewC,
					expectedPath: [ viewC, target ],
					expectedData: []
				} );

				viewC.fire( 'not-delegated' );

				sinon.assert.calledOnce( spyFoo );
				sinon.assert.calledOnce( spyBar );
				sinon.assert.calledOnce( spyBaz );
			} );

			it( 'does not forward events which are not supposed to be delegated', () => {
				const target = new View();
				const view = new View();
				const spyFoo = sinon.spy();
				const spyBar = sinon.spy();
				const spyBaz = sinon.spy();

				collection.delegate( 'foo', 'bar', 'baz' ).to( target );
				collection.add( view );

				target.on( 'foo', spyFoo );
				target.on( 'bar', spyBar );
				target.on( 'baz', spyBaz );

				view.fire( 'foo' );
				view.fire( 'bar' );
				view.fire( 'baz' );
				view.fire( 'not-delegated' );

				sinon.assert.callOrder( spyFoo, spyBar, spyBaz );
				sinon.assert.callCount( spyFoo, 1 );
				sinon.assert.callCount( spyBar, 1 );
				sinon.assert.callCount( spyBaz, 1 );
			} );

			it( 'stops forwarding when view removed from the collection', () => {
				const target = new View();
				const view = new View();
				const spy = sinon.spy();

				collection.delegate( 'foo' ).to( target );
				target.on( 'foo', spy );

				collection.add( view );
				view.fire( 'foo' );

				sinon.assert.callCount( spy, 1 );

				collection.remove( 0 );
				view.fire( 'foo' );

				sinon.assert.callCount( spy, 1 );
			} );

			it( 'supports deep event delegation', ( done ) => {
				const target = new View();
				const viewA = new View();
				const viewAA = new View();
				const data = {};

				const deepCollection = viewA.createCollection();

				collection.add( viewA );
				collection.delegate( 'foo' ).to( target );

				deepCollection.add( viewAA );
				deepCollection.delegate( 'foo' ).to( viewA );

				target.on( 'foo', ( ...args ) => {
					assertDelegated( args, {
						expectedName: 'foo',
						expectedSource: viewAA,
						expectedPath: [ viewAA, viewA, target ],
						expectedData: [ data ]
					} );

					done();
				} );

				viewAA.fire( 'foo', data );
			} );
		} );
	} );
} );

function createTestCollection() {
	collection = new ViewCollection();
}

function assertDelegated( evtArgs, { expectedName, expectedSource, expectedPath, expectedData } ) {
	const evtInfo = evtArgs[ 0 ];

	expect( evtInfo.name ).to.equal( expectedName );
	expect( evtInfo.source ).to.equal( expectedSource );
	expect( evtInfo.path ).to.deep.equal( expectedPath );
	expect( evtArgs.slice( 1 ) ).to.deep.equal( expectedData );
}