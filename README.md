# Javascript Cross Thread Data Sharing

Testing several strategies for sharing objects and arrays between workers.

### Hosted @

https://endj.github.io/JavaScript-Cross-Worker-Data-Sharing/

### Arrays

Avoiding copying of data through move semantics seems to work well. Possible to split up data and distribute it across several workers for larger improvement if the algorithm allows it.

### Objects

Structured cloning turned out to be unsurprisingly the fastest. 

* TLV (https://en.wikipedia.org/wiki/Type%E2%80%93length%E2%80%93value) based custom serialization with defensive copying
* TLV-based custom serialization with buffer reuse
* Structured cloning


### Did not test

SharedArrayBuffer
