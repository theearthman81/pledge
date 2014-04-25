(function (root, cls) {
   if (typeof define === 'function' && define.amd) {
      define(cls);
   } else {
      root.Pledge = cls();
   }
}(this, function() {   

   "use strict";

   /**
    * @class Pledge
    * @constructor
    *
    * @param {Function} resolver
    */
   function Pledge(resolver) {
      if(!this || !Pledge.isPledge(this)) {
        return new Pledge(resolver);
      }
      var boundResolve = (function(pledge) {
        return function() {
         return pledge._resolve.apply(pledge, arguments);
        };
      }(this)),
        boundReject = (function(pledge) {
          return function() {
            return pledge._reject.apply(pledge, arguments);
         };
        }(this));
      
      this._state = Pledge.PENDING;
      this._purgeHandlers();
      if (typeof resolver === 'function') {
        resolver(boundResolve, boundReject);
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
    * TODO.
    *
    * @param {Object} value
    */
   Pledge.prototype._resolve = function(value) {
      this._state = Pledge.RESOLVED;
      this._result = value;
      
      for (var i = 0, l = this._onFulfilled.length; i < l; i++) {
        this._onFulfilled[i](value);
      }
      this._purgeHandlers();
   };

   /**
    * TODO.
    *
    * @param {Object} value
    */
   Pledge.prototype._reject = function(value) {
      this._state = Pledge.REJECTED;
      this._result = value;
      
      for (var i = 0, l = this._onRejected.length; i < l; i++) {
        this._onRejected[i](value);
      }
      this._purgeHandlers();
   };

   /**
    * TODO - should this exist or should a new promise be returned each time instead of chaining 'this'.
    *
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
    * TODO.
    *
    * @param {Function} onRejected
    * @return {Pledge}
    */
   Pledge.prototype.catch = function(onRejected) {
      if (typeof onRejected === 'function') {
        this.onRejected.push(onRejected);
      }

      if (this._state === Pledge.REJECTED) {
        this._reject(this._result);
      }

      return this;
   };

   /**
    * TODO.
    *
    * @return {String}
    */
   Pledge.prototype.getState = function() {
      return this._state;
   };

   /**
    * TODO.
    *
    * @return {Object}
    */
   Pledge.prototype.getResult = function() {
      return this._result;
   };

   /**
    * TODO.
    *
    * @param {Object} value
    * @return {Pledge}
    */
   Pledge.resolve = function(value) {
      return new Pledge(function(resolve, reject) {
        resolve(value);
      });
   };

   /**
    * TODO.
    *
    * @param {Object} value
    * @return {Pledge}
    */
   Pledge.reject = function(value) {
      return new Pledge(function(resolve, reject) {
        reject(value);
      });
   };

   /**
    * TODO.
    *
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
    * TODO.
    *
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
    * TODO.
    *
    * @param {Pledge|Object} check
    */
   Pledge.isPledge = function(check) {
      return check instanceof Pledge;
   };

   /**
    * @type {String}
    */
   Pledge.PENDING = 'pending';

   /**
    * @type {String}
    */
   Pledge.REJECTED = 'rejected';

   /**
    * @type {String}
    */
   Pledge.RESOLVED = 'resolved';

   return Pledge;
}));
