/* Synthetic public-API regression checks for the verified upstream backports. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <expat.h>
static double seconds(void) { struct timespec t; assert(clock_gettime(CLOCK_MONOTONIC, &t) == 0); return t.tv_sec + t.tv_nsec / 1e9; }
int main(void) {
  const size_t n = 70u << 20;
  char *big = malloc(n + 32); assert(big);
  size_t used = (size_t)sprintf(big, "<r a='"); memset(big + used, 'x', n); used += n;
  used += (size_t)sprintf(big + used, "'/>");
  XML_Parser p = XML_ParserCreate(NULL); assert(p);
  assert(XML_Parse(p, big, (int)used, 1) == XML_STATUS_OK);
  const char *small = "<r a='value'><c>text</c></r>";
  for (int i = 0; i < 3; ++i) { assert(XML_ParserReset(p, NULL)); assert(XML_Parse(p, small, (int)strlen(small), 1) == XML_STATUS_OK); }
  XML_ParserFree(p); free(big); puts("Parser reset after 70MiB attribute: three subsequent parses passed");
  const size_t padding = 12u << 20;
  char *xml = malloc(padding + 8192); assert(xml);
  used = (size_t)sprintf(xml, "<!DOCTYPE r [<!--"); memset(xml + used, 'x', padding); used += padding;
  used += (size_t)sprintf(xml + used, "--><!ENTITY a 'aaaaaaaaaa'>");
  for (char name = 'b'; name <= 'j'; ++name) {
    used += (size_t)sprintf(xml + used, "<!ENTITY %c '", name);
    for (int i = 0; i < 10; ++i) used += (size_t)sprintf(xml + used, "&%c;", name - 1);
    used += (size_t)sprintf(xml + used, "'>");
  }
  used += (size_t)sprintf(xml + used, "]><r>&j;</r>");
  p = XML_ParserCreate(NULL); assert(p); double start = seconds();
  assert(XML_Parse(p, xml, (int)used, 1) == XML_STATUS_ERROR);
  assert(XML_GetErrorCode(p) == XML_ERROR_AMPLIFICATION_LIMIT_BREACH);
  double elapsed = seconds() - start; assert(elapsed < 5.0);
  printf("Padded-DTD amplification rejected before expansion in %.3fs\n", elapsed);
  XML_ParserFree(p); free(xml); return 0;
}
