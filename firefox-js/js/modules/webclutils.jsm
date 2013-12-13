/*
 * This file is part of WebCL – Web Computing Language.
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL
 * was not distributed with this file, You can obtain
 * one at http://mozilla.org/MPL/2.0/.
 *
 * The Original Contributor of this Source Code Form is
 * Nokia Research Center Tampere (http://webcl.nokiaresearch.com).
 *
 */


var EXPORTED_SYMBOLS = [ "webclutils" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var Exception = Components.Exception;


var PREF_WEBCL_ALLOWED = "extensions.webcl.allowed";
var PREF_WEBCL_ALLOWED__NOT_SET = -1;
var PREF_WEBCL_ALLOWED__FALSE =   0;
var PREF_WEBCL_ALLOWED__TRUE =    1;

var PREF_OCLLIB = "extensions.webcl.opencllib";


Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://nrcwebcl/modules/logger.jsm");

Cu.import ("resource://nrcwebcl/modules/lib_ocl/platform.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/device.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/context.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/commandqueue.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/event.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/memoryobject.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/program.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/kernel.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/sampler.jsm");

Cu.import ("resource://nrcwebcl/modules/lib_ocl/ocl_constants.jsm");
Cu.import ("resource://nrcwebcl/modules/lib_ocl/ocl_exception.jsm");

Cu.import ("resource://nrcwebcl/modules/webclconstructors.jsm");



function getPref_allowed (setDefaultIfNeeded)
{
  var rv = -1;

  try
  {
    rv = Services.prefs.getIntPref (PREF_WEBCL_ALLOWED);
    if (rv === undefined) throw new Error();
  }
  catch (e)
  {
    rv = -1;

    if (setDefaultIfNeeded)
    {
      try {
        Services.prefs.setIntPref (PREF_WEBCL_ALLOWED, PREF_WEBCL_ALLOWED__NOT_SET);
      } catch (e) {}
    }
  }

  return rv;
}

function setPref_allowed (value)
{
  try {
    Services.prefs.setIntPref (PREF_WEBCL_ALLOWED, value);
  } catch (e) {
    LOG ("Failed to set " + PREF_WEBCL_ALLOWED + ": " + e);
  }
}

function setPrefObserver_allowed (observer)
{
  // NOTE: Usin weak reference
  //prefs.addObserver (PREF_WEBCL_ALLOWED, observer, true);
  Services.prefs.addObserver (PREF_WEBCL_ALLOWED, observer, true);
}

function getPref_openclLib (setDefaultIfNeeded)
{
  var rv = "";

  try
  {
    rv = Services.prefs.getCharPref (PREF_OCLLIB);
  }
  catch (e)
  {
    rv = "";
    if (setDefaultIfNeeded)
    {
      try {
        prefs.setCharPref (PREF_OCLLIB, "");
      } catch (e) {}
    }
  }

  return rv;
}

function setPrefObserver_openclLib (observer)
{
  var prefs = Cc["@mozilla.org/preferences-service;1"].getService (Ci.nsIPrefBranch);
  if (prefs)
  {
    // NOTE: Usin weak reference
    prefs.addObserver (PREF_OCLLIB, observer, true);
  }
}



function wrapInternal (value, owner)
{
  TRACE ("common", "wrapInternal", arguments);

  var rv = value;

  if (Array.isArray(value))
  {
    var rv = [];
    for (var i = 0; i < value.length; ++i)
    {
      rv.push (wrapInternal (value[i], owner));
    }
  }
  else if (value instanceof Platform)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLPlatform");
    var rv = createWebCLPlatform (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof Device)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLDevice");
    var rv = createWebCLDevice (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof Context)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLContext");
    var rv = createWebCLContext (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof CommandQueue)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLCommandQueue");
    var rv = createWebCLCommandQueue (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof CLEvent)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLEvent");
    var rv = createWebCLEvent (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof MemoryObject)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLMemoryObject");

    try {
      var type = value.getInfo (ocl_info.CL_MEM_TYPE);
    } catch (e) { ERROR ("wrapInternal: Failed to get memory object type."); }

    switch (type)
    {
      case ocl_const.CL_MEM_OBJECT_BUFFER:
        var rv = createWebCLBuffer (owner);
        break;

      case ocl_const.CL_MEM_OBJECT_IMAGE2D:
        var rv = createWebCLImage (owner);
        break;

      default:
        var rv = createWebCLMemoryObject (owner);
        break;
    }

    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof Program)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLProgram");
    var rv = createWebCLProgram (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof Kernel)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLKernel");
    var rv = createWebCLKernel (owner);
    rv.wrappedJSObject._internal = value;
  }
  else if (value instanceof Sampler)
  {
    if (!value) throw new CLInternalError ("Invalid internal", "WebCLSampler");
    var rv = createWebCLSampler (owner);
    rv.wrappedJSObject._internal = value;
  }

  return rv;
}


function unwrapInternalOrNull (object)
{
  rv = null;

  try
  {
    if (!object || typeof(object) != "object") return null;
    var o = object;
    if (o instanceof Ci.IWebCLPlatform || o instanceof Ci.IWebCLDevice ||
        o instanceof Ci.IWebCLContext || o instanceof Ci.IWebCLCommandQueue ||
        o instanceof Ci.IWebCLEvent || o instanceof Ci.IWebCLMemoryObject ||
        o instanceof Ci.IWebCLProgram || o instanceof Ci.IWebCLKernel ||
        o instanceof Ci.IWebCLSampler
    )
    {
      if (o.wrappedJSObject) o = o.wrappedJSObject;
      rv = o._internal;
    }
    else if (o instanceof Ci.IWebCLImageDescriptor)
    {
      if (o.wrappedJSObject) o = o.wrappedJSObject;
      rv = o;
    }
  }
  catch(e) {}

  return rv;
}


function unwrapInternal (object)
{
  var rv = unwrapInternalOrNull (object);
  if (rv == null) rv = object;
  return rv;
}



function validateEvent (obj)
{
  return (obj && obj instanceof CLEvent && obj._internal && !obj._internal.isNull());
}

function validateKernel (obj)
{
  return (obj && obj instanceof Kernel && obj._internal && !obj._internal.isNull());
}

function validateBuffer (obj)
{
  return (obj && obj instanceof MemoryObject && obj._internal && !obj._internal.isNull());
}

function validateImage (obj)
{
  return (obj && obj instanceof MemoryObject && obj._internal && !obj._internal.isNull());
}

function validateArray (arr, itemValidator)
{
  if (Array.isArray(arr))
  {
    if (itemValidator && typeof(itemValidator) == "function")
    {
      for (var i = 0; i < arr.length; ++i)
      {
        if (!itemValidator(arr[i])) return false;
      }
      return true;
    }
  }
  return false;
}

function validateNumber (n)
{
  return (!isNaN(+n));
}




var webclutils = {
  getPref_allowed:              getPref_allowed,
  setPref_allowed:              setPref_allowed,
  setPrefObserver_allowed:      setPrefObserver_allowed,
  getPref_openclLib:            getPref_openclLib,
  setPrefObserver_openclLib:    setPrefObserver_openclLib,

  // Preference ids
  PREF_WEBCL_ALLOWED:           PREF_WEBCL_ALLOWED,
  PREF_OCLLIB:                  PREF_OCLLIB,

  // Preference values
  PREF_WEBCL_ALLOWED__NOT_SET:  PREF_WEBCL_ALLOWED__NOT_SET,
  PREF_WEBCL_ALLOWED__FALSE:    PREF_WEBCL_ALLOWED__FALSE,
  PREF_WEBCL_ALLOWED__TRUE:     PREF_WEBCL_ALLOWED__TRUE,

  wrapInternal:                 wrapInternal,
  unwrapInternalOrNull:         unwrapInternalOrNull,
  unwrapInternal:               unwrapInternal,

  validateEvent:                validateEvent,
  validateKernel:               validateKernel,
  validateBuffer:               validateBuffer,
  validateImage:                validateImage,
  validateArray:                validateArray,
  validateNumber:               validateNumber
};

