"use strict";
 
describe('PledgeTest', function(){
   
   it('can resolve immediately and execute the correct handler', function(){
       var spy = jasmine.createSpy();
       var pledge = new Pledge(function(resolve, reject) {
          resolve('foo');
       });
       
       pledge.then(spy);
       expect(spy).toHaveBeenCalledWith('foo');
   });
   
   it('can resolve asynchronously and execute the correct handler', function(){ 
      var spy = jasmine.createSpy();
      var pledge;
      runs(function() {
         pledge = new Pledge(function(resolve, reject) {
            setTimeout(function() {
               resolve('foo');
            }, 10);
         });
         pledge.then(spy);
      });

      waitsFor(function() {
         return pledge.getState() === Pledge.RESOLVED;
      }, 'Pledge should be resolved', 10);
         
      runs(function() {
         expect(spy).toHaveBeenCalledWith('foo');
      });
   });
   
   it('can reject immediately and execute the correct handler', function(){
       var spy = jasmine.createSpy();
       var pledge = new Pledge(function(resolve, reject) {
          reject('foo');
       });
       
       pledge.then(null, spy);
       expect(spy).toHaveBeenCalledWith('foo');
   });
   
   it('can rejected asynchronously and execute the correct handler', function(){ 
      var spy = jasmine.createSpy();
      var pledge;
      runs(function() {
         pledge = new Pledge(function(resolve, reject) {
            setTimeout(function() {
               reject('foo');
            }, 10);
         });
         pledge.then(null, spy);
      });

      waitsFor(function() {
         return pledge.getState() === Pledge.REJECTED;
      }, 'Pledge should be rejected', 10);
         
      runs(function() {
         expect(spy).toHaveBeenCalledWith('foo');
      });
   });
   
   it('can reject immediately and execute the correct handler via the catch method', function(){
       var spy = jasmine.createSpy();
       var pledge = new Pledge(function(resolve, reject) {
          reject('foo');
       });
       
       pledge.catch(spy);
       expect(spy).toHaveBeenCalledWith('foo');
   });
   
   it('can reject asynchronously and execute the correct handler via the catch method', function(){ 
      var spy = jasmine.createSpy();
      var pledge;
      runs(function() {
         pledge = new Pledge(function(resolve, reject) {
            setTimeout(function() {
               reject('foo');
            }, 10);
         });
         pledge.catch(spy);
      });

      waitsFor(function() {
         return pledge.getState() === Pledge.REJECTED;
      }, 'Pledge should be rejected', 10);
         
      runs(function() {
         expect(spy).toHaveBeenCalledWith('foo');
      });
   });
   
   it('will run the reject handler when an error is thrown in the resolve handler passed into "then"', function(){ 
      var spy = jasmine.createSpy();
      var pledge = new Pledge(function(resolve, reject) {
         resolve('foo');
      });
      pledge.then(function() {
         throw new Error('bar');
      }).catch(spy);
         
      expect(spy).toHaveBeenCalled();
      expect(spy.argsForCall[0][0].message).toBe('bar');
   });
   
   it('will allow chaining of the "then" methods to modify a value', function(){ 
      var spy = jasmine.createSpy();
      var pledge = new Pledge(function(resolve, reject) {
         resolve(1);
      });
      pledge.then(function(value) {
         return value + 1;
      }).then(function(value) {
         return value * 2;
      }).then(spy);
         
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(4);
   });
   
   it('will invoke a pledge and use its "then" method if one is returned from a handler o get its value', function(){ 
      var spy = jasmine.createSpy();
      var pledge = new Pledge(function(resolve, reject) {
         resolve('foo');
      });
      var otherPledge = new Pledge(function(resolve, reject) {
         resolve('bar');
      });
      pledge.then(function(value) {
         return otherPledge;
      }).then(spy);
         
      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith('bar');
   });
   
   it('can return correct state via getter', function(){
       var spy = jasmine.createSpy();
       var pledgeResolve = new Pledge(function(resolve, reject) {
          resolve('foo');
       });
       var pledgeReject = new Pledge(function(resolve, reject) {
          reject('foo');
       });
        
       expect(pledgeResolve.getState()).toBe(Pledge.RESOLVED);
       expect(pledgeReject.getState()).toBe(Pledge.REJECTED);
   });
   
   it('can return correct result via getter', function(){
       var spy = jasmine.createSpy();
       var pledgeResolve = new Pledge(function(resolve, reject) {
          resolve('foo');
       });
       var pledgeReject = new Pledge(function(resolve, reject) {
          reject('bar');
       });
        
       expect(pledgeResolve.getResult()).toBe('foo');
       expect(pledgeReject.getResult()).toBe('bar');
   });
   
   it('can return a resolved Pledge via its static resolve method', function(){
       var pledge = Pledge.resolve();
       
       expect(pledge.getState()).toBe(Pledge.RESOLVED);
   });
   
   it('can return a rejected Pledge via its static reject method', function(){
       var pledge = Pledge.reject();
       
       expect(pledge.getState()).toBe(Pledge.REJECTED);
   });
   
   it('can check whther a supplied object is a Pledge instance or not', function(){
      [undefined, null, 0, true, {}, 'test', window, Pledge].forEach(function(value) {
          expect(Pledge.isPledge(value)).toBeFalsy();
      });
      
      [Pledge.resolve(), Pledge.reject()].forEach(function(value) {
          expect(Pledge.isPledge(value)).toBeTruthy();
      });
   });
});
