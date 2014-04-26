(function (root, cls) {
   if (typeof define === 'function' && define.amd) {
      define(cls);
   } else {
      root.Pledge = cls();
   }
}(this, function() {   

   "use strict";
     
   function bindScope(fn, scope) {
      if (Function.prototype.bind) {
         return fn.bind(scope);
      } else {
         return function() {
            return fn.apply(scope, arguments);
         };
      }
   }

   /**
    * @class Pledge
    * @constructor
    *
    * @param {Function} resolver
    */
   function Pledge(resolver) {
      if(!Pledge.isPledge(this)) {
         return new Pledge(resolver);
      }
      
      var boundResolve = bindScope(this._resolve, this),
         boundReject = bindScope(this._reject, this);
      
      this._state = Pledge.PENDING;
      this._purgeHandlers();
      
      if (typeof resolver === 'function') {
        try {
           resolver(boundResolve, boundReject);
        } catch (err) {
           this._reject(err);
        }
      } else {
         throw new Error('Pledge constructor takes a function argument.');
      }
   }

   /**
    * @type {Function[]}
    */
   Pledge.prototype._onFulfilled = null;

   /**
    * @type {Function[]}
    */
   Pledge.prototype._onRejected = null;

   /**
    * @type {String}
    */
   Pledge.prototype._state = null;

   /**
    * @type {Object}
    */
   Pledge.prototype._result = null;

   /**
    * Proxies external Pledges returned as values in callbacks to the resolve/reject handlers.
    *
    * @param {Pledge} externalPledge
    */
   Pledge.prototype._resolveExternalPledge = function(externalPledge) {
      externalPledge.then(bindScope(this._resolve, this), bindScope(this._reject, this));   
   };
   
   /**
    * Function that will be passed to the resolver method supplied by the user to allow them to resolve the Pledge.
    *
    * @param {Object} value
    */
   Pledge.prototype._resolve = function(value) {
      var chainedValue;
      try {
         this._state = Pledge.RESOLVED;
         this._result = value;
         
         for (var i = 0, l = this._onFulfilled.length; i < l; i++) {
            chainedValue = this._onFulfilled[i](value);
            if(typeof chainedValue !== 'undefined') {
               this._result = value = chainedValue;
            }
            if (Pledge.isPledge(value)) {
               this._resolveExternalPledge(value);
               
               return this._onFulfilled = this._onFulfilled.slice(i);
            }
         }
      } catch (err) {
         this._reject(err);
      }
      
      this._purgeHandlers();
   };
   
   /**
    * Function that will be passed to the resolver method supplied by the user to allow them to reject the Pledge.
    *
    * @param {Object} value
    */
   Pledge.prototype._reject = function(value) {
      var chainedValue;
      this._state = Pledge.REJECTED;
      this._result = value;
      
      for (var i = 0, l = this._onRejected.length; i < l; i++) {
         chainedValue = this._onRejected[i](value);
         if(typeof chainedValue !== 'undefined') {
            this._result = value = chainedValue;
         }
         if (Pledge.isPledge(value)) {
            this._resolveExternalPledge(value);
           
            return this._onRejected = this._onRejected.slice(i);
         }
      }
      
      this._purgeHandlers();
   };

   /**
    * Clean handlers after Pledge has resolves/rejected.
    */
   Pledge.prototype._purgeHandlers = function() {
      this._onFulfilled = [];
      this._onRejected = [];
   };

   /**
    * TODO.
    *
    * @param {Function} onFulfilled
    * @param {Function} onRejected
    * @return {Pledge}
    */
   Pledge.prototype.then = function(onFulfilled, onRejected) {
      if (typeof onFulfilled === 'function') {
         this._onFulfilled.push(onFulfilled);
      }
      
      if (typeof onRejected === 'function') {
         this._onRejected.push(onRejected);
      }
      
      if (this._state === Pledge.RESOLVED) {
         this._resolve(this._result);
      }
      
      if (this._state === Pledge.REJECTED) {
         this._reject(this._result);
      }
      
      return this;
   };

   /**
    * Catch to get Pledge state.
    *
    * @method catch
    * @param {Function} onRejected
    * @return {Pledge}
    */
   Pledge.prototype.catch = function(onRejected) {
      if (typeof onRejected === 'function') {
         this._onRejected.push(onRejected);
      }

      if (this._state === Pledge.REJECTED) {
         this._reject(this._result);
      }

      return this;
   };

   /**
    * Utility to get Pledge state.
    *
    * @method getState
    * @return {String}
    */
   Pledge.prototype.getState = function() {
      return this._state;
   };

   /**
    * Utility to get Pledge result.
    *
    * @method getResult
    * @return {Object}
    */
   Pledge.prototype.getResult = function() {
      return this._result;
   };

   /**
    * Static method that returns a resolved Pledge.
    *
    * @method reject
    * @param {Object} value
    * @return {Pledge}
    */
   Pledge.resolve = function(value) {
      return new Pledge(function(resolve, reject) {
         resolve(value);
      });
   };

   /**
    * Static method that returns a rejected Pledge.
    *
    * @method reject
    * @param {Object} value
    * @return {Pledge}
    */
   Pledge.reject = function(value) {
      return new Pledge(function(resolve, reject) {
         reject(value);
      });
   };

   /**
    * Static method that takes an Array of Pledges/Objects and returns a new Pledge that resolves only when
    * all the pledges in the given Array have resolved. The resolve handler will recieve an Array of all results 
    * in the same order as the original Pledge Array. If any fail returned Pledge will fail and pass the value of the failed Pledge.
    *
    * @method all
    * @param {Pledge[]|Object[]} pledgeArr
    * @return {Pledge}
    */
   Pledge.all = function(pledgeArr) {
      pledgeArr = [].concat(pledgeArr);
      
      var pledge = new Pledge(function(resolve, reject) {
         var fulFilledArguments = [];
         var state = Pledge.PENDING;
         var pledgeArrClone = pledgeArr.slice();
        
         for (var i = 0, l = pledgeArrClone.length; i < l; i++) {
            if (!Pledge.isPledge(pledgeArrClone[i])) {
               pledgeArrClone[i] = Pledge.resolve(pledgeArrClone[i]);
            }
          
            pledgeArrClone[i].then(function(i) {
               return function(value) {
                  if (state !== Pledge.REJECTED) {
                     fulFilledArguments[i] = value;
                     if (fulFilledArguments.length === l) {
                        resolve(fulFilledArguments);
                        state = Pledge.RESOLVED;
                     }
                  }
               };
            }(i), function(value) {
               reject(value);
               state = Pledge.REJECTED;
            });
         }
      });

      return pledge;
   };

   /**
    * Static method that takes an Array of Pledges/Objects and returns a new Pledge that resolves or rejects as soon as the first
    * Pledge in the supplied Array resolves or rejects.
    *
    * @method race
    * @param {Pledge[]|Object[]} pledgeArr
    * @return {Pledge}
    */
   Pledge.race = function(pledgeArr) {
      pledgeArr = [].concat(pledgeArr);
      
      var pledgeArrClone = pledgeArr.slice();
      var pledge = new Pledge(function(resolve, reject) {
         var state = Pledge.PENDING;
        
         for (var i = 0, l = pledgeArrClone.length; i < l; i++) {
            if (!Pledge.isPledge(pledgeArrClone[i])) {
               pledgeArrClone[i] = Pledge.resolve(pledgeArrClone[i]);
             }
          
            pledgeArrClone[i].then(function(value) {
               if (state === Pledge.PENDING) {
                  resolve(value);
                  state = Pledge.RESOLVED;
               }
            }, function(value) {
               if (state === Pledge.PENDING) {
                  reject(value);
                  state = Pledge.REJECTED;
               }
            });
         }
      });
      
      return pledge;
   };
   
   /**
    * Static method for checking whether given argument is an instance of Pledge.
    *
    * @method isPledge
    * @param {Pledge|Object} check
    * @return {Boolean}
    */
   Pledge.isPledge = function(check) {
      return check && check instanceof Pledge;
   };

   /**
    * @static
    * @type {String}
    */
   Pledge.PENDING = 'pending';

   /**
    * @static
    * @type {String}
    */
   Pledge.REJECTED = 'rejected';

   /**
    * @static
    * @type {String}
    */
   Pledge.RESOLVED = 'resolved';

   return Pledge;
}));
